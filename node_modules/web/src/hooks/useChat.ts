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
  generateGroupKey,
  encryptGroupKey,
  decryptGroupKey,
  importGroupKey,
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

export interface Group {
  id: string;
  name: string;
  creatorUsername: string;
  encryptedGroupKey?: string; // Encrypted for the current user
  decryptedGroupKey?: CryptoKey; // In-memory decrypted key
}

const SOCKET_SERVER = process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:4000';

export const useChat = (username: string | null, selectedUserUsername: string | null) => {
  console.log(`🎣 [useChat] Called with username: ${username}, selected: ${selectedUserUsername}`);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const sharedKeysRef = useRef<Record<string, CryptoKey>>({});
  const usersRef = useRef<User[]>([]);
  const groupsRef = useRef<Group[]>([]);
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

          // 3. Fetch groups and decrypt keys
          try {
            console.log('📥 Fetching groups from server...');
            const groupRes = await fetch('/api/groups');
            if (groupRes.ok) {
              const groupData: Group[] = await groupRes.json();
              console.log(`📦 Found ${groupData.length} groups.`);
              
              // Set groups immediately so they show up in the UI
              setGroups(groupData);
              groupsRef.current = groupData;

              // Decrypt group keys in the background
              for (const group of groupData) {
                if (group.encryptedGroupKey) {
                  try {
                    const creator = usersRef.current.find(u => u.username.trim().toLowerCase() === group.creatorUsername.toLowerCase());
                    let creatorPubKeyBase64 = creator?.publicKey;
                    
                    if (!creatorPubKeyBase64 && group.creatorUsername.toLowerCase() === normalizedUsername) {
                      creatorPubKeyBase64 = pubKeyBase64;
                    }

                    if (creatorPubKeyBase64) {
                      const creatorPubKey = await importPublicKey(creatorPubKeyBase64);
                      const payload = JSON.parse(group.encryptedGroupKey);
                      group.decryptedGroupKey = await decryptGroupKey(payload, creatorPubKey, keyPairRef.current!.privateKey);
                      console.log(`🔐 Decrypted group key for: ${group.name}`);
                    } else {
                      console.warn(`⚠️ Could not find public key for group creator: ${group.creatorUsername}`);
                    }
                  } catch (e) {
                    console.error(`❌ Failed to decrypt key for group ${group.name}:`, e);
                  }
                }
              }
              // Final sync to ensure all decrypted keys are ready in state
              setGroups([...groupData]);
              groupsRef.current = [...groupData];
            }
          } catch (e) {
            console.error('Failed to fetch groups:', e);
          }

          setIsReady(true);

          // 4. Connect to socket
          const token = localStorage.getItem('chat_token');
          const newSocket = io(SOCKET_SERVER, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            auth: { token }
          });

          setSocket(newSocket);
          currentSocket = newSocket;

          newSocket.on('connect', async () => {
            console.log('Socket connected, joining...');
            setIsConnected(true);
            newSocket.emit('join');
            // Join all group rooms
            groupsRef.current.forEach(g => {
              console.log(`🔗 Joining group room: ${g.name} (${g.id})`);
              newSocket.emit('join-group', { groupId: g.id });
            });
          });

          newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            if (err.message.includes('Authentication error')) {
              window.location.href = '/login';
            }
          });

          newSocket.on('user-list', (userList: User[]) => {
            const filtered = userList.filter(u => u.username.trim().toLowerCase() !== normalizedUsername);
            sharedKeysRef.current = {};
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
              setMessages((prev) => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });

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

          newSocket.on('user-typing', (data: { from: string, isTyping: boolean }) => {
            setTypingUsers((prev) => ({
              ...prev,
              [data.from.toLowerCase()]: data.isTyping
            }));
          });

          newSocket.on('new-group-message', async (data: { id: string, groupId: string, from: string, fromName: string, content: EncryptedPayload, timestamp: any }) => {
            console.log('📩 New group message incoming in:', data.groupId);
            
            try {
              const group = groupsRef.current.find(g => g.id === data.groupId);
              if (!group || !group.decryptedGroupKey) {
                console.warn('❓ Group key not available for:', data.groupId);
                return;
              }

              const decrypted = await decryptMessage(group.decryptedGroupKey, data.content);

              const newMessage: Message = {
                id: data.id || Math.random().toString(36).substring(7),
                from: data.from,
                fromName: data.fromName || data.from,
                to: data.groupId, // Using groupId as 'to' for group messages
                content: decrypted,
                timestamp: new Date(data.timestamp).getTime(),
              };

              setMessages((prev) => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
              console.log('✅ Group message added to state:', newMessage.id);
              
              // Handle Notification
              if (data.groupId !== activeUserRef.current && Notification.permission === 'granted') {
                new Notification(`New group message in ${group.name}`, {
                  body: `${data.fromName}: ${decrypted}`,
                  icon: '/favicon.ico',
                });
              }
            } catch (err) {
              console.error('❌ Group decryption failed for message:', data.id, err);
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
  
  useEffect(() => {
    console.log(`🎬 [useEffect] Triggered for group history. Selected: ${selectedUserUsername} (Type: ${typeof selectedUserUsername})`);
    const fetchGroupHistory = async () => {
      console.log(`🔍 [EFFECT] fetchGroupHistory triggered for: ${selectedUserUsername}. Total groups: ${groups.length}`);
      if (!selectedUserUsername || !groups.length) return;
      
      const group = groupsRef.current.find(g => g.id.toLowerCase() === selectedUserUsername?.toLowerCase());
      if (!group) {
        console.warn(`🔍 Group ${selectedUserUsername} not found in groups list yet.`);
        return;
      }
      if (!group.decryptedGroupKey) {
        console.warn(`🔑 Decryption key for group ${group.name} is missing. Cannot fetch history.`);
        return;
      }

      try {
        const url = `/api/groups/${group.id}/messages`;
        console.log(`📥 Fetching group history from: ${url}`);
        const res = await fetch(url);
        if (res.ok) {
          const history = await res.json();
          console.log(`📦 Received ${history.length} encrypted messages from server for group ${group.name}`);
          const decryptedHistory: Message[] = [];

          for (const msg of history) {
            try {
              console.log(`🔓 Decrypting history msg: ${msg.id}...`);
              const decrypted = await decryptMessage(group.decryptedGroupKey, msg.content);
              decryptedHistory.push({
                id: msg.id,
                from: msg.fromUsername,
                fromName: msg.fromUsername,
                to: group.id,
                content: decrypted,
                timestamp: new Date(msg.timestamp).getTime(),
              });
            } catch (e) {
              console.error('Failed to decrypt group history message:', e);
            }
          }
          setMessages(prev => {
            // Merge and deduplicate (by ID)
            const combined = [...prev, ...decryptedHistory];
            const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            console.log(`📊 Updated messages state. Now has ${unique.length} total messages.`);
            return unique;
          });
        } else {
          console.error(`❌ History fetch failed with status ${res.status}: ${res.statusText}`);
        }
      } catch (e) {
        console.error('Failed to fetch group history:', e);
      }
    };

    fetchGroupHistory();
  }, [selectedUserUsername, groups]);

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

  const sendTypingStatus = useCallback((to: string, isTyping: boolean) => {
    if (socket) {
      socket.emit('typing', { to, isTyping });
    }
  }, [socket]);

  // --- GROUP ACTIONS ---

  const createGroup = async (name: string, memberUsernames: string[]) => {
    if (!keyPairRef.current || !username) return;

    try {
      // 1. Generate a new Group Key (AES)
      const groupKey = await generateGroupKey();
      
      // 2. Encrypt the Group Key for each member (including self)
      const normalizedMe = username.trim().toLowerCase();
      const membersToEncrypt = [...new Set([...memberUsernames.map(u => u.trim().toLowerCase()), normalizedMe])];
      const encryptedMemberKeys = [];

      for (const mUsername of membersToEncrypt) {
        const normUser = mUsername.trim().toLowerCase();
        let mPubKeyBase64;

        if (normUser === username.trim().toLowerCase()) {
          mPubKeyBase64 = await exportPublicKey(keyPairRef.current.publicKey);
        } else {
          const userObj = usersRef.current.find(u => u.username.trim().toLowerCase() === normUser);
          mPubKeyBase64 = userObj?.publicKey;
        }

        if (mPubKeyBase64) {
          const mPubKey = await importPublicKey(mPubKeyBase64);
          const encryptedKey = await encryptGroupKey(groupKey, mPubKey, keyPairRef.current.privateKey);
          encryptedMemberKeys.push({
            username: normUser,
            encryptedGroupKey: JSON.stringify(encryptedKey)
          });
        }
      }

      // 3. Send to API
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          members: encryptedMemberKeys
        })
      });

      if (res.ok) {
        const newGroup = await res.json();
        // Attach the decrypted key so the creator can use it immediately
        newGroup.decryptedGroupKey = groupKey;
        setGroups(prev => {
          const next = [...prev, newGroup];
          groupsRef.current = next;
          return next;
        });
        
        // Join the socket room
        if (socket) {
          socket.emit('join-group', { groupId: newGroup.id });
        }
        
        return newGroup;
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const sendGroupMessage = useCallback(async (groupId: string, text: string) => {
    if (!socket || !username) return;

    try {
      const group = groupsRef.current.find(g => g.id === groupId);
      if (!group || !group.decryptedGroupKey) {
        console.error('Group key not found for sending message');
        return;
      }

      const encrypted = await encryptMessage(group.decryptedGroupKey, text);
      
      socket.emit('send-group-message', {
        groupId,
        content: encrypted
      });

      // Optimistic update: Add to state immediately so it doesn't "vanish"
      setMessages((prev) => {
        const newMessage: Message = {
          id: `temp-${Date.now()}`,
          from: username.trim().toLowerCase(),
          fromName: 'You',
          to: groupId,
          content: text,
          timestamp: Date.now(),
          type: 'group'
        };
        return [...prev, newMessage];
      });
    } catch (err) {
      console.error('Failed to send group message:', err);
    }
  }, [socket, username, groups]);

  return { 
    users, 
    groups,
    messages, 
    sendMessage, 
    sendGroupMessage,
    createGroup,
    sendTypingStatus,
    isConnected, 
    isReady, 
    socketId: socket?.id, 
    getSharedKeyFingerprint, 
    securityWarning,
    unreadCounts,
    typingUsers
  };
};
