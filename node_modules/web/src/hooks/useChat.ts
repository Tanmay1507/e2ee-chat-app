'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  exportKeyPair,
  importKeyPair,
  EncryptedPayload,
} from '@/lib/crypto';

export interface Message {
  id: string;
  from: string;
  fromName: string;
  to: string;
  content: string;
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  publicKey: string;
  isOnline?: boolean;
  department?: string;
  role?: string;
}

const SOCKET_SERVER = 'http://localhost:4000';

export const useChat = (username: string | null, selectedUserUsername: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const sharedKeysRef = useRef<Record<string, CryptoKey>>({});
  const usersRef = useRef<User[]>([]);
  const activeUserRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Sync active user and clear unread counts
  useEffect(() => {
    activeUserRef.current = selectedUserUsername;
    if (selectedUserUsername) {
      const key = selectedUserUsername.toLowerCase();
      setUnreadCounts((prev) => {
        if (prev[key]) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    }
  }, [selectedUserUsername]);

  useEffect(() => {
    let currentSocket: Socket | null = null;

    const initChat = async () => {
      if (!username) return;

      const normalizedUsername = username.trim().toLowerCase();

      // 1. Fetch all personnel immediately from API (Sync Directory)
      try {
        const res = await fetch('/api/auth/users');
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter((u: any) => u.username.trim().toLowerCase() !== normalizedUsername);
          setUsers(filtered);
          usersRef.current = filtered;
          
          // 2. Load or Generate local keys
          // --- KEY LOADING ---
          let keys: CryptoKeyPair;
          const savedKeys = localStorage.getItem(`keys_${normalizedUsername}`);
          
          if (savedKeys) {
            try {
              keys = await importKeyPair(JSON.parse(savedKeys));
              console.log('📦 Loaded existing keys from localStorage.');
            } catch (e) {
              console.error('❌ Failed to parse keys, generating new ones', e);
              keys = await generateKeyPair();
              const exported = await exportKeyPair(keys);
              localStorage.setItem(`keys_${normalizedUsername}`, JSON.stringify(exported));
            }
          } else {
            console.warn('🆕 No keys found in local storage, generating new ones...');
            keys = await generateKeyPair();
            const exported = await exportKeyPair(keys);
            localStorage.setItem(`keys_${normalizedUsername}`, JSON.stringify(exported));
          }
          
          keyPairRef.current = keys;
          const pubKeyBase64 = await exportPublicKey(keys.publicKey);
          
          // --- IDENTITY LOGGING ---
          console.warn(`🆔 [MY IDENTITY] Username: ${normalizedUsername}`);
          console.warn(`🔑 [MY PUBLIC KEY] ...${pubKeyBase64.slice(-30)}`);
          
          // --- CRYPTO SELF-TEST ---
          try {
            console.log('🧪 Running Crypto Self-Test...');
            const selfPubKey = await importPublicKey(pubKeyBase64);
            const selfSharedKey = await deriveSharedKey(keys.privateKey, selfPubKey);
            const testText = "SECURE_TEST_123";
            const encrypted = await encryptMessage(selfSharedKey, testText);
            const decrypted = await decryptMessage(selfSharedKey, encrypted);
            if (decrypted === testText) {
              console.warn('✅ CRYPTO SELF-TEST PASSED: Encryption engine is healthy.');
            } else {
              throw new Error("Self-test mismatch");
            }
          } catch (testErr) {
            console.error('🚨 CRYPTO SELF-TEST FAILED! Encryption is broken:', testErr);
          }
          // ------------------------

          setIsReady(true);

          // 3. ONLY NOW Connect directly to the backend
          const token = localStorage.getItem('chat_token');
          const newSocket = io('http://localhost:4000', {
            transports: ['websocket', 'polling'],
            withCredentials: true, // Required to send the JWT cookie (backup)
            auth: { token } // Primary authentication method
          });

          setSocket(newSocket);
          currentSocket = newSocket;

          newSocket.on('connect', async () => {
            // --- CRYPTO SELF-TEST ---
            try {
              const testSharedKey = await deriveSharedKey(keyPairRef.current!.privateKey, keyPairRef.current!.publicKey);
              console.warn('✅ CRYPTO SELF-TEST PASSED: Local KeyPair is healthy.');
            } catch (testErr) {
              console.error('❌ CRYPTO SELF-TEST FAILED: Your local keys are mismatched or corrupt!', testErr);
              console.warn('🔄 FORCING SESSION RESET to repair crypto state...');
              localStorage.clear();
              document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.reload();
              return;
            }

            console.log('Socket connected, joining...');
            setIsConnected(true);
            // No need to send username or publicKey, server gets it from JWT!
            newSocket.emit('join');
          });

          newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            if (err.message.includes('Authentication error')) {
              // Redirect to login if authentication fails
              console.warn('Authentication failed, redirecting to login...');
              window.location.href = '/login';
            }
          });

          newSocket.on('user-list', (userList: User[]) => {
            const filtered = userList.filter(u => u.username.trim().toLowerCase() !== normalizedUsername);
            
            // Clear all cached shared keys whenever the list updates
            // This is the safest way to ensure we always use the latest public keys
            sharedKeysRef.current = {};
            console.log('🔄 User list updated. Shared key cache cleared for all peers.');

            setUsers(filtered);
            usersRef.current = filtered;
          });

          newSocket.on('chat-history', async (history: any[]) => {
            console.log('Received chat history, length:', history.length);
            const decryptedHistory: Message[] = [];
            
            for (const msg of history) {
              try {
                if (!msg.from || !msg.to) {
                  console.warn('Skipping history message with missing fields:', msg);
                  continue;
                }

                const normalizedMe = username.trim().toLowerCase();
                const isMe = msg.from.trim().toLowerCase() === normalizedMe;
                const peerKey = isMe ? msg.to.trim().toLowerCase() : msg.from.trim().toLowerCase();
                const peerUsername = isMe ? msg.to : msg.from;
                
                // Use the key provided by the server to prevent race conditions
                let peerPubKeyBase64 = isMe ? msg.toPublicKey : msg.fromPublicKey;
                
                // Fallback to directory if server didn't provide it
                if (!peerPubKeyBase64) {
                  const peer = usersRef.current.find(u => u.username.trim().toLowerCase() === peerKey);
                  if (peer) {
                    peerPubKeyBase64 = peer.publicKey;
                    console.log(`🔍 Found key for ${peerUsername} in directory`);
                  }
                }

                if (peerPubKeyBase64) {
                  let sharedKey = sharedKeysRef.current[peerKey];
                  if (!sharedKey) {
                    try {
                      console.log(`🔐 Deriving shared key with ${peerUsername} using key: ${peerPubKeyBase64.substring(0, 15)}...`);
                      const peerPubKey = await importPublicKey(peerPubKeyBase64);
                      sharedKey = await deriveSharedKey(keyPairRef.current!.privateKey, peerPubKey);
                      sharedKeysRef.current[peerKey] = sharedKey;
                      console.log(`✅ Key derived for ${peerUsername}`);
                    } catch (deriveErr) {
                      console.error(`❌ Failed to derive shared key for ${peerUsername}:`, deriveErr);
                      continue; 
                    }
                  }

                  if (sharedKey) {
                    try {
                      const decrypted = await decryptMessage(sharedKey, msg.content);
                      decryptedHistory.push({
                        id: msg.id || Math.random().toString(36).substring(7),
                        from: msg.from, 
                        fromName: isMe ? 'Me' : msg.from,
                        to: msg.to,
                        content: decrypted,
                        timestamp: new Date(msg.createdAt || msg.timestamp).getTime(),
                      });
                    } catch (decryptErr) {
                      console.error(`❌ Decryption FAILED for message ${msg.id} from ${msg.from}. This usually means the keys changed.`);
                      decryptedHistory.push({
                        id: msg.id || Math.random().toString(36).substring(7),
                        from: msg.from,
                        fromName: isMe ? 'Me' : msg.from,
                        to: msg.to,
                        content: '⚠️ [Secure Decryption Failed: Key Mismatch]',
                        timestamp: new Date(msg.createdAt || msg.timestamp).getTime(),
                      });
                    }
                  }
                } else {
                  console.warn(`❓ No public key available for ${peerUsername}. Cannot decrypt.`);
                }
              } catch (e) {
                console.error(`Failed to decrypt history message from ${msg.from}:`, e);
              }
            }
            console.log('Successfully decrypted history messages:', decryptedHistory.length);
            setMessages(decryptedHistory);
          });

          newSocket.on('new-message', async (data: { from: string; fromName: string; fromPublicKey?: string; content: EncryptedPayload }) => {
            console.log('📩 New message incoming from:', data.from);
            const peerKey = data.from.toLowerCase();
            
            try {
              // 1. Get the public key for this specific message
              const directoryUser = usersRef.current.find(u => u.username.trim().toLowerCase() === peerKey);
              const pubKeyBase64 = data.fromPublicKey || directoryUser?.publicKey;

              if (!pubKeyBase64) {
                console.warn('❓ No public key available for sender:', data.from);
                return;
              }

              // --- SECURITY CHECK: IDENTITY INTEGRITY ---
              if (directoryUser && directoryUser.publicKey !== data.fromPublicKey) {
                console.error(`🚨 SECURITY ALERT: Public key mismatch for ${data.from}!`);
                setSecurityWarning(`Security alert: Public key for ${data.from} has changed unexpectedly.`);
              }
              // ------------------------------------------

              console.warn(`📩 [INCOMING] From ${data.from} using Key: ...${pubKeyBase64.slice(-30)}`);

              // 2. Derive shared key
              const senderPubKey = await importPublicKey(pubKeyBase64);
              const sharedKey = await deriveSharedKey(keyPairRef.current!.privateKey, senderPubKey);
              sharedKeysRef.current[peerKey] = sharedKey;

              // --- CHANNEL SYNC LOGGING ---
              const exported = await window.crypto.subtle.exportKey('raw', sharedKey);
              const hashBuffer = await window.crypto.subtle.digest('SHA-256', exported);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const channelId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 4).toUpperCase();
              console.warn(`🔐 [SYNC] Channel ID with ${data.from}: ${channelId}`);
              // ----------------------------

              // 3. Decrypt
              const decrypted = await decryptMessage(sharedKey, data.content);

              const newMessage: Message = {
                id: Math.random().toString(36).substring(7),
                from: data.from, 
                fromName: data.fromName || data.from,
                to: normalizedUsername,
                content: decrypted,
                timestamp: Date.now(),
              };

              // Handle Notification and Unread Count
              const isActive = peerKey === activeUserRef.current?.toLowerCase();
              
              // Store message in state (UI filters it by active user)
              setMessages((prev) => [...prev, newMessage]);

              // Handle Notification and Unread Count if background
              if (!isActive) {
                // Increment unread count
                setUnreadCounts((prev) => ({
                  ...prev,
                  [peerKey]: (prev[peerKey] || 0) + 1,
                }));

                // Trigger Desktop Notification
                if (Notification.permission === 'granted') {
                  new Notification(`New message from ${newMessage.fromName}`, {
                    body: decrypted,
                    icon: '/favicon.ico',
                  });
                }
              }
            } catch (err) {
              console.error('❌ Decryption failed for real-time message from:', data.from, err);
              // Clear the shared key so it's re-derived on the next attempt
              delete sharedKeysRef.current[peerKey];
            }
          });

          newSocket.on('disconnect', () => {
            setIsConnected(false);
          });
        }
      } catch (err) {
        console.error('Failed to initialize chat:', err);
      }
    };

    initChat();

    return () => {
      if (currentSocket) {
        currentSocket.close();
      }
    };
  }, [username]);

  // sendMessage function
  const sendMessage = useCallback(async (toUsername: string, text: string) => {
    if (!socket || !keyPairRef.current || !username) return;

    try {
      const peerKey = toUsername.trim().toLowerCase();
      const recipient = usersRef.current.find((u) => u.username.trim().toLowerCase() === peerKey);
      if (!recipient) {
        console.error('Recipient not found in directory:', toUsername);
        return;
      }

      let sharedKey = sharedKeysRef.current[peerKey];
      if (!sharedKey) {
        try {
          console.warn(`🔐 [OUTGOING] To ${toUsername} using Key: ...${recipient.publicKey.slice(-30)}`);
          const recipientPubKey = await importPublicKey(recipient.publicKey);
          sharedKey = await deriveSharedKey(keyPairRef.current.privateKey, recipientPubKey);
          sharedKeysRef.current[peerKey] = sharedKey;

          // --- CHANNEL SYNC LOGGING ---
          const exported = await window.crypto.subtle.exportKey('raw', sharedKey);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', exported);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const channelId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 4).toUpperCase();
          console.warn(`🔐 [SYNC] Channel ID with ${toUsername}: ${channelId}`);
          // ----------------------------
        } catch (deriveErr) {
          console.error(`❌ Failed to derive shared key for outgoing message to ${toUsername}:`, deriveErr);
          return;
        }
      }

      const encrypted = await encryptMessage(sharedKey, text);
      const myPubKeyBase64 = await exportPublicKey(keyPairRef.current.publicKey);
      
      console.log(`📤 Emitting send-message to ${toUsername}...`);
      
      socket.emit('send-message', {
        to: recipient.username.trim().toLowerCase(),
        fromPublicKey: myPubKeyBase64,
        content: encrypted,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          from: username.trim().toLowerCase(),
          fromName: 'Me',
          to: recipient.username.trim().toLowerCase(), // Include 'to' for filtering
          content: text,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [socket, username]);

  const [fingerprints, setFingerprints] = useState<Record<string, string>>({});

  // Helper to update fingerprints
  useEffect(() => {
    const updateFingerprints = async () => {
      const newFingerprints: Record<string, string> = {};
      for (const [peer, key] of Object.entries(sharedKeysRef.current)) {
        try {
          const exported = await window.crypto.subtle.exportKey('raw', key);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', exported);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          newFingerprints[peer] = hashHex.substring(0, 4).toUpperCase();
        } catch (e) {
          newFingerprints[peer] = 'ERR';
        }
      }
      setFingerprints(newFingerprints);
    };

    const interval = setInterval(updateFingerprints, 2000);
    return () => clearInterval(interval);
  }, []);

  const getSharedKeyFingerprint = (peerUsername: string | null): string => {
    if (!peerUsername) return '...';
    return fingerprints[peerUsername.toLowerCase()] || 'IDLE';
  };

  return { 
    users, 
    messages, 
    sendMessage, 
    isConnected, 
    isReady, 
    socketId: socket?.id, 
    getSharedKeyFingerprint, 
    securityWarning,
    unreadCounts
  };
};
