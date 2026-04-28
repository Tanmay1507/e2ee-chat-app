'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { User } from './useUsers';
import { Group } from './useGroups';
import {
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  exportPublicKey,
} from '@/lib/crypto';

export interface Message {
  id: string;
  from: string;
  fromName: string;
  to: string;
  content: string;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  type?: 'private' | 'group';
  replyTo?: {
    id: string;
    from: string;
    fromName: string;
    content: string;
  };
}

export const useMessages = (
  socket: Socket | null,
  username: string | null,
  selectedUserUsername: string | null,
  usersRef: React.MutableRefObject<User[]>,
  groupsRef: React.MutableRefObject<Group[]>,
  keyPairRef: React.MutableRefObject<CryptoKeyPair | null>,
  sharedKeysRef: React.MutableRefObject<Record<string, CryptoKey>>,
  groups: Group[]
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [fingerprints, setFingerprints] = useState<Record<string, string>>({});

  const messagesRef = useRef<Message[]>([]);
  const activeUserRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeUserRef.current = selectedUserUsername;
    if (selectedUserUsername) {
      const key = selectedUserUsername.toLowerCase();
      
      // Mark as read on server
      if (socket) {
        socket.emit('mark-all-read', { from: key });
      }

      setUnreadCounts((prev) => {
        if (prev[key]) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    }
  }, [selectedUserUsername, socket]);

  const markAllMessagesRead = useCallback((fromUsername: string) => {
    if (socket) {
      socket.emit('mark-all-read', { from: fromUsername });
    }
  }, [socket]);

  // Fingerprinting
  useEffect(() => {
    const updateFingerprints = async () => {
      const newFingerprints: Record<string, string> = {};
      for (const [peer, key] of Object.entries(sharedKeysRef.current)) {
        try {
          if (!key || key.type !== 'secret') continue;
          const exported = await window.crypto.subtle.exportKey('raw', key);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', exported);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          newFingerprints[peer] = hashHex.substring(0, 8).toUpperCase();
        } catch (e) {
          if (!newFingerprints[peer]) {
            console.warn(`⚠️ Fingerprinting failed for ${peer}:`, e);
            newFingerprints[peer] = 'ERR';
          }
        }
      }
      setFingerprints(newFingerprints);
    };

    const interval = setInterval(updateFingerprints, 5000);
    return () => clearInterval(interval);
  }, [sharedKeysRef]);

  const getSharedKeyFingerprint = (peerUsername: string | null): string => {
    if (!peerUsername) return '...';
    return fingerprints[peerUsername.toLowerCase()] || 'IDLE';
  };

  const setupSocketListeners = useCallback((socket: Socket, normalizedUsername: string) => {
    socket.on('chat-history', async (history: any[]) => {
      const decryptedHistory: Message[] = [];
      for (const msg of history) {
        try {
          if (!msg.from || !msg.to) continue;
          const normalizedMe = username?.trim().toLowerCase();
          const isMe = msg.from?.trim().toLowerCase() === normalizedMe;
          const peerKey = isMe ? msg.to?.trim().toLowerCase() : msg.from?.trim().toLowerCase();
          
          if (!peerKey) continue;
          
          let peerPubKeyBase64 = isMe ? msg.toPublicKey : msg.fromPublicKey;
          if (!peerPubKeyBase64) {
            const peer = usersRef.current.find(u => u.username.trim().toLowerCase() === peerKey);
            if (peer) peerPubKeyBase64 = peer.publicKey;
          }

          if (peerPubKeyBase64 && keyPairRef.current) {
            let sharedKey = sharedKeysRef.current[peerKey];
            if (!sharedKey) {
              const peerPubKey = await importPublicKey(peerPubKeyBase64);
              sharedKey = await deriveSharedKey(keyPairRef.current.privateKey, peerPubKey);
              sharedKeysRef.current[peerKey] = sharedKey;
            }

            if (sharedKey) {
              try {
                const decrypted = await decryptMessage(sharedKey, msg.content);
                let finalContent = decrypted;
                let replyToData = undefined;

                try {
                  const payload = JSON.parse(decrypted);
                  if (payload.type === 'reply') {
                    finalContent = payload.content;
                    replyToData = payload.replyTo;
                  } else if (payload.type === 'text') {
                    finalContent = payload.content;
                  }
                } catch {
                  // Not a JSON payload, use as is
                }

                decryptedHistory.push({
                  id: msg.id || Math.random().toString(36).substring(7),
                  from: msg.from, 
                  fromName: isMe ? 'Me' : msg.from,
                  to: msg.to,
                  content: finalContent,
                  replyTo: replyToData,
                  status: msg.status,
                  timestamp: new Date(msg.createdAt || msg.timestamp).getTime(),
                  type: 'private'
                });
              } catch (e) {
                decryptedHistory.push({
                  id: msg.id || Math.random().toString(36).substring(7),
                  from: msg.from,
                  fromName: isMe ? 'Me' : msg.from,
                  to: msg.to,
                  content: '⚠️ [Secure Decryption Failed]',
                  timestamp: new Date(msg.createdAt || msg.timestamp).getTime(),
                });
              }
            }
          }
        } catch (e) {
          console.error(`Failed to decrypt history message:`, e);
        }
      }
      setMessages(decryptedHistory);
    });

    socket.on('message-edited', async (data: { messageId: string, newContent: any }) => {
      try {
        const msg = messagesRef.current.find(m => m.id === data.messageId);
        if (!msg) return;
        const peerKey = msg.from.toLowerCase() === username?.toLowerCase() ? msg.to.toLowerCase() : msg.from.toLowerCase();
        let sharedKey = sharedKeysRef.current[peerKey];
        if (sharedKey) {
          const decrypted = await decryptMessage(sharedKey, data.newContent);
          setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: decrypted, isEdited: true } : m));
        }
      } catch (e) { console.error('Failed to decrypt edited message:', e); }
    });

    socket.on('message-deleted', (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    socket.on('group-message-edited', async (data: { messageId: string, groupId: string, newContent: any }) => {
      try {
        const group = groupsRef.current.find(g => g.id === data.groupId);
        if (group?.decryptedGroupKey) {
          const decrypted = await decryptMessage(group.decryptedGroupKey, data.newContent);
          setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: decrypted, isEdited: true } : m));
        }
      } catch (e) { console.error('Failed to decrypt edited group message:', e); }
    });

    socket.on('group-message-deleted', (data: { messageId: string }) => {
      console.log('🗑️ Received group-message-deleted for ID:', data.messageId);
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    socket.on('error', (data: { message: string }) => {
      console.error('❌ Socket error:', data.message);
      alert(`Action failed: ${data.message}`);
    });

    socket.on('new-message', async (data: any) => {
      if (!data.from || !data.to) return;
      if (!keyPairRef.current) {
        console.error('❌ [new-message] keyPairRef.current is null');
        return;
      }

      const isMe = data.from.trim().toLowerCase() === normalizedUsername;
      const peerKey = isMe ? data.to.trim().toLowerCase() : data.from.trim().toLowerCase();

      let decrypted = '⚠️ [Decryption Failed]';
      try {
        const directoryUser = usersRef.current.find(u => u.username?.trim().toLowerCase() === peerKey);
        const pubKeyBase64 = isMe
          ? directoryUser?.publicKey
          : (data.fromPublicKey || directoryUser?.publicKey);
        
        if (pubKeyBase64) {
          if (!isMe && directoryUser && data.fromPublicKey && directoryUser.publicKey !== data.fromPublicKey) {
            setSecurityWarning(`Security alert: Public key for ${data.from} has changed.`);
          }

          let sharedKey = sharedKeysRef.current[peerKey];
          if (!sharedKey) {
            const peerPubKey = await importPublicKey(pubKeyBase64);
            sharedKey = await deriveSharedKey(keyPairRef.current.privateKey, peerPubKey);
            sharedKeysRef.current[peerKey] = sharedKey;
          }

          decrypted = await decryptMessage(sharedKey, data.content);
        }
      } catch (err) {
        console.error('❌ Decryption failed:', err);
      }

      let finalContent = decrypted;
      let replyToData = undefined;

      try {
        const payload = JSON.parse(decrypted);
        if (payload.type === 'reply') {
          finalContent = payload.content;
          replyToData = payload.replyTo;
        } else if (payload.type === 'text') {
          finalContent = payload.content;
        }
      } catch {
        // Not a JSON payload, use as is
      }

      const isActive = peerKey === activeUserRef.current?.toLowerCase();
      const newMessage: Message = {
        id: data.id || Math.random().toString(36).substring(7),
        from: data.from, 
        fromName: isMe ? 'Me' : (data.fromName || data.from),
        to: data.to,
        content: finalContent,
        replyTo: replyToData,
        status: data.status || 'sent',
        timestamp: Date.now(),
        type: 'private'
      };

      setMessages((prev) => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);

      if (!isMe && !isActive) {
        setUnreadCounts((prev) => ({ ...prev, [peerKey]: (prev[peerKey] || 0) + 1 }));
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`New message from ${newMessage.fromName}`, { body: decrypted, icon: '/favicon.ico' });
        }
      } else if (!isMe && isActive) {
        socket.emit('mark-read', { messageId: newMessage.id });
      }
    });

    socket.on('message-status-update', (data: { messageId: string, status: 'sent' | 'delivered' | 'read' }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, status: data.status } : m));
    });

    socket.on('messages-read', (data: { from: string }) => {
      setMessages(prev => prev.map(m => 
        (m.to?.toLowerCase() === data.from?.toLowerCase() && m.from?.toLowerCase() === normalizedUsername) 
        ? { ...m, status: 'read' } 
        : m
      ));
    });

    socket.on('user-typing', (data: { from: string, isTyping: boolean }) => {
      setTypingUsers((prev) => ({ ...prev, [data.from.toLowerCase()]: data.isTyping }));
    });

    socket.on('new-group-message', async (data: any) => {
      try {
        const group = groupsRef.current.find(g => g.id === data.groupId);
        if (!group?.decryptedGroupKey) return;
        const decrypted = await decryptMessage(group.decryptedGroupKey, data.content);
        
        let finalContent = decrypted;
        let replyToData = undefined;

        try {
          const payload = JSON.parse(decrypted);
          if (payload.type === 'reply') {
            finalContent = payload.content;
            replyToData = payload.replyTo;
          } else if (payload.type === 'text') {
            finalContent = payload.content;
          }
        } catch {
          // Not a JSON payload
        }

        const newMessage: Message = {
          id: data.id || Math.random().toString(36).substring(7),
          from: data.from,
          fromName: data.fromName || data.from,
          to: data.groupId,
          content: finalContent,
          replyTo: replyToData,
          timestamp: new Date(data.timestamp).getTime(),
          type: 'group'
        };
        setMessages((prev) => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
        if (data.groupId !== activeUserRef.current && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`New group message in ${group.name}`, { body: `${data.fromName}: ${decrypted}`, icon: '/favicon.ico' });
        }
      } catch (err) { console.error('❌ Group decryption failed:', err); }
    });
  }, [username, usersRef, groupsRef, keyPairRef, sharedKeysRef]);

  useEffect(() => {
    if (socket && username) {
      setupSocketListeners(socket, username.trim().toLowerCase());
    }
    return () => {
      if (socket) {
        socket.off('chat-history');
        socket.off('message-edited');
        socket.off('message-deleted');
        socket.off('group-message-edited');
        socket.off('group-message-deleted');
        socket.off('new-message');
        socket.off('message-status-update');
        socket.off('messages-read');
        socket.off('user-typing');
        socket.off('new-group-message');
      }
    };
  }, [socket, username, setupSocketListeners]);

  useEffect(() => {
    const fetchGroupHistory = async () => {
      if (!selectedUserUsername || !groups.length) return;
      
      const group = groupsRef.current.find(g => g.id.toLowerCase() === selectedUserUsername?.toLowerCase());
      if (!group || !group.decryptedGroupKey) return;

      try {
        const res = await fetch(`/api/groups/${group.id}/messages`);
        if (res.ok) {
          const history = await res.json();
          const decryptedHistory: Message[] = [];

          for (const msg of history) {
            try {
              const decrypted = await decryptMessage(group.decryptedGroupKey, msg.content);
              
              let finalContent = decrypted;
              let replyToData = undefined;

              try {
                const payload = JSON.parse(decrypted);
                if (payload.type === 'reply') {
                  finalContent = payload.content;
                  replyToData = payload.replyTo;
                } else if (payload.type === 'text') {
                  finalContent = payload.content;
                }
              } catch {
                // Not a JSON payload
              }

              decryptedHistory.push({
                id: msg.id,
                from: msg.fromUsername,
                fromName: msg.fromUsername,
                to: group.id,
                content: finalContent,
                replyTo: replyToData,
                timestamp: new Date(msg.timestamp).getTime(),
                type: 'group'
              });
            } catch (e) {
              console.error('Failed to decrypt group history message:', e);
            }
          }
          setMessages(prev => {
            const combined = [...prev, ...decryptedHistory];
            const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            return unique;
          });
        }
      } catch (e) {
        console.error('Failed to fetch group history:', e);
      }
    };

    fetchGroupHistory();
  }, [selectedUserUsername, groups]);

  const sendMessage = useCallback(async (toUsername: string, text: string, replyTo?: Message['replyTo']) => {
    if (!socket || !keyPairRef.current || !username) return;

    try {
      const peerKey = toUsername.trim().toLowerCase();
      const recipient = usersRef.current.find((u) => u.username.trim().toLowerCase() === peerKey);
      if (!recipient) return;

      let sharedKey = sharedKeysRef.current[peerKey];
      if (!sharedKey) {
        const recipientPubKey = await importPublicKey(recipient.publicKey);
        sharedKey = await deriveSharedKey(keyPairRef.current.privateKey, recipientPubKey);
        sharedKeysRef.current[peerKey] = sharedKey;
      }

      const payload = replyTo ? { type: 'reply', content: text, replyTo } : { type: 'text', content: text };
      const encrypted = await encryptMessage(sharedKey, JSON.stringify(payload));
      const myPubKeyBase64 = await exportPublicKey(keyPairRef.current.publicKey);
      
      socket.emit('send-message', {
        to: recipient.username.trim().toLowerCase(),
        fromPublicKey: myPubKeyBase64,
        content: encrypted,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [socket, username, usersRef, keyPairRef, sharedKeysRef]);

  const sendGroupMessage = useCallback(async (groupId: string, text: string, isNotice: boolean = false, replyTo?: Message['replyTo']) => {
    if (!socket || !username) return;

    try {
      const group = groupsRef.current.find(g => g.id === groupId);
      if (!group || !group.decryptedGroupKey) return;

      const payload = replyTo ? { type: 'reply', content: text, replyTo } : { type: 'text', content: text };
      const encrypted = await encryptMessage(group.decryptedGroupKey, isNotice ? text : JSON.stringify(payload));
      
      socket.emit('send-group-message', {
        groupId,
        content: encrypted,
        isNotice
      });
    } catch (err) {
      console.error('Failed to send group message:', err);
    }
  }, [socket, username, groupsRef]);

  const sendTypingStatus = useCallback((to: string, isTyping: boolean) => {
    if (socket) {
      socket.emit('typing', { to, isTyping });
    }
  }, [socket]);

  const editMessage = async (messageId: string, newText: string) => {
    if (!username || !keyPairRef.current) return;
    try {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;

      if (msg.type === 'group') {
        const group = groupsRef.current.find(g => g.id === msg.to);
        if (!group || !group.decryptedGroupKey) throw new Error('Group key missing');
        
        const encrypted = await encryptMessage(group.decryptedGroupKey, newText);
        socket?.emit('edit-group-message', { messageId, newContent: encrypted });
      } else {
        const myUsername = username.toLowerCase();
        const peerKey = msg.from.toLowerCase() === myUsername ? msg.to.toLowerCase() : msg.from.toLowerCase();
        let sharedKey = sharedKeysRef.current[peerKey];
        
        if (!sharedKey) {
          const recipient = usersRef.current.find(u => u.username.toLowerCase() === peerKey);
          if (!recipient) throw new Error('Recipient not found');
          
          const recipientPubKey = await importPublicKey(recipient.publicKey);
          sharedKey = await deriveSharedKey(keyPairRef.current.privateKey, recipientPubKey);
          sharedKeysRef.current[peerKey] = sharedKey;
        }

        const encrypted = await encryptMessage(sharedKey, newText);
        socket?.emit('edit-message', { messageId, newContent: encrypted });
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const deleteMessage = useCallback(async (messageId: string) => {
    console.log(`🗑️ Attempting to delete message: ${messageId}`);
    try {
      const msg = messagesRef.current.find(m => m.id === messageId);
      if (!msg) {
        console.warn('⚠️ Message not found in ref for deletion:', messageId);
        // Fallback: search in state if ref is somehow stale
        setMessages(prev => prev.filter(m => m.id !== messageId));
        return;
      }

      console.log(`🔍 Deleting message of type: ${msg.type}, ID: ${messageId}`);

      if (msg.type === 'group') {
        socket?.emit('delete-group-message', { messageId });
      } else {
        socket?.emit('delete-message', { messageId });
      }

      // Optimistically remove from local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
      console.log(`✅ Optimistically removed message ${messageId} from local state`);
    } catch (err) {
      console.error('❌ Failed to delete message:', err);
    }
  }, [socket]);

  return {
    messages,
    unreadCounts,
    typingUsers,
    securityWarning,
    getSharedKeyFingerprint,
    sendMessage,
    sendGroupMessage,
    sendTypingStatus,
    markAllMessagesRead,
    editMessage,
    deleteMessage
  };
};
