'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useCrypto } from './useCrypto';
import { useUsers, User } from './useUsers';
import { useGroups, Group } from './useGroups';
import { useMessages, Message } from './useMessages';

export type { User, Group, Message };

export const useChat = (username: string | null, selectedUserUsername: string | null) => {
  const { socket, isConnected } = useSocket(username);
  const { isReady, keyPairRef, sharedKeysRef, initKeys } = useCrypto();
  
  const { users, usersRef } = useUsers(socket, username);
  const { 
    groups, 
    groupsRef, 
    createGroup, 
    removeMember, 
    updateGroup, 
    addMemberToGroup, 
    updateMemberRole,
    deleteGroup
  } = useGroups(socket, username, users, usersRef, keyPairRef, isReady);

  const {
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
  } = useMessages(
    socket,
    username,
    selectedUserUsername,
    usersRef,
    groupsRef,
    keyPairRef,
    sharedKeysRef,
    groups
  );

  // Initialize keys when username is available
  useEffect(() => {
    if (username) {
      initKeys(username);
    }
  }, [username, initKeys]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  return { 
    users, 
    groups,
    messages, 
    sendMessage, 
    sendGroupMessage,
    removeMember,
    updateGroup,
    addMemberToGroup,
    editMessage,
    deleteMessage,
    createGroup,
    sendTypingStatus,
    markAllMessagesRead,
    isConnected, 
    isReady, 
    socketId: socket?.id, 
    getSharedKeyFingerprint, 
    securityWarning,
    unreadCounts,
    typingUsers,
    updateMemberRole // Added this although it wasn't in the original return, it was in the code
  };
};
