'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { User } from './useUsers';
import {
  importPublicKey,
  decryptGroupKey,
  generateGroupKey,
  encryptGroupKey,
  exportPublicKey,
} from '@/lib/crypto';

export interface Group {
  id: string;
  name: string;
  description?: string;
  creatorUsername: string;
  role?: 'admin' | 'member';
  encryptedGroupKey?: string; // Encrypted for the current user
  decryptedGroupKey?: CryptoKey; // In-memory decrypted key
  membersCount?: number;
}

export const useGroups = (
  socket: Socket | null,
  username: string | null,
  users: User[],
  usersRef: React.MutableRefObject<User[]>,
  keyPairRef: React.MutableRefObject<CryptoKeyPair | null>,
  isReady: boolean
) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const groupsRef = useRef<Group[]>([]);

  const decryptGroupKeys = useCallback(async (groupData: Group[], normalizedUsername: string, publicKey: CryptoKey) => {
    if (!keyPairRef.current) return;
    
    const pubKeyBase64 = await exportPublicKey(publicKey);
    let updated = false;

    for (const group of groupData) {
      if (group.encryptedGroupKey && !group.decryptedGroupKey) {
        try {
          const creator = usersRef.current.find(u => u.username.trim().toLowerCase() === group.creatorUsername.toLowerCase());
          let creatorPubKeyBase64 = creator?.publicKey;
          
          if (!creatorPubKeyBase64 && group.creatorUsername.toLowerCase() === normalizedUsername) {
            creatorPubKeyBase64 = pubKeyBase64;
          }

          if (creatorPubKeyBase64) {
            console.log(`🔓 Attempting decryption for group: ${group.name}`);
            const creatorPubKey = await importPublicKey(creatorPubKeyBase64);
            const payload = JSON.parse(group.encryptedGroupKey);
            group.decryptedGroupKey = await decryptGroupKey(payload, creatorPubKey, keyPairRef.current.privateKey);
            console.log(`✅ Decrypted key for group: ${group.name}`);
            updated = true;
          } else {
            console.warn(`⏳ Creator ${group.creatorUsername} not found in directory yet for group ${group.name}`);
          }
        } catch (e) {
          console.error(`❌ Failed to decrypt key for group ${group.name}:`, e);
        }
      }
    }
    if (updated) {
      setGroups([...groupData]);
      groupsRef.current = [...groupData];
    }
  }, [usersRef, keyPairRef]);

  const fetchGroups = useCallback(async () => {
    if (!username || !keyPairRef.current) return;
    const normalizedUsername = username.trim().toLowerCase();
    try {
      const groupRes = await fetch('/api/groups');
      if (groupRes.ok) {
        const groupData: Group[] = await groupRes.json();
        setGroups(groupData);
        groupsRef.current = groupData;
        await decryptGroupKeys(groupData, normalizedUsername, keyPairRef.current.publicKey);
      }
    } catch (e) {
      console.error('Failed to fetch groups:', e);
    }
  }, [username, keyPairRef, decryptGroupKeys]);

  useEffect(() => {
    if (username && isReady && keyPairRef.current) {
      fetchGroups();
    }
  }, [username, isReady, fetchGroups]); // keyPairRef changes once initialized

  useEffect(() => {
    if (socket && groups.length > 0) {
      groups.forEach(g => socket.emit('join-group', { groupId: g.id }));
    }
  }, [socket, groups]);

  useEffect(() => {
    if (username && isReady && keyPairRef.current && groups.length > 0) {
      const undecryptedGroups = groups.filter(g => g.encryptedGroupKey && !g.decryptedGroupKey);
      if (undecryptedGroups.length > 0) {
        console.log(`🔄 Retrying decryption for ${undecryptedGroups.length} groups as users list updated...`);
        decryptGroupKeys(groups, username.trim().toLowerCase(), keyPairRef.current.publicKey);
      }
    }
  }, [users, username, isReady, decryptGroupKeys, groups]);

  const createGroup = async (name: string, memberUsernames: string[]) => {
    if (!keyPairRef.current || !username) return;

    try {
      const groupKey = await generateGroupKey();
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
        newGroup.decryptedGroupKey = groupKey;
        setGroups(prev => {
          const next = [...prev, newGroup];
          groupsRef.current = next;
          return next;
        });
        
        if (socket) {
          socket.emit('join-group', { groupId: newGroup.id });
        }
        
        return newGroup;
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const removeMember = async (groupId: string, memberUsername: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberUsername}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to remove member:', err);
      return false;
    }
  };

  const updateGroup = async (groupId: string, name: string, description: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      if (res.ok) {
        const updated = await res.json();
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: updated.name, description: updated.description } : g));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update group:', err);
      return false;
    }
  };

  const addMemberToGroup = async (groupId: string, memberUsername: string) => {
    if (!keyPairRef.current) return false;
    try {
      const group = groups.find(g => g.id === groupId);
      console.log('➕ Attempting to add member:', memberUsername, 'to group:', group?.name);
      
      if (!group) {
        console.error('❌ Group not found in state:', groupId);
        throw new Error('Group not found');
      }
      
      if (!group.decryptedGroupKey) {
        console.error('❌ Group key not decrypted for current user. Cannot add members.');
        throw new Error('Group key not available. Try refreshing or wait for decryption.');
      }

      const userRes = await fetch(`/api/auth/users`);
      const allUsers: User[] = await userRes.json();
      const newUser = allUsers.find(u => u.username.toLowerCase() === memberUsername.toLowerCase());
      
      if (!newUser) {
        console.error('❌ User not found in directory:', memberUsername);
        throw new Error('User not found in directory');
      }

      console.log('🔐 Encrypting group key for new member...');
      const keys = keyPairRef.current;
      const newMemberPubKey = await importPublicKey(newUser.publicKey);
      const encryptedPayload = await encryptGroupKey(group.decryptedGroupKey, newMemberPubKey, keys.privateKey);

      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: memberUsername,
          encryptedGroupKey: JSON.stringify(encryptedPayload)
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add member');
      }
      
      return true;
    } catch (err: any) {
      console.error('Failed to add member:', err);
      return false;
    }
  };

  const updateMemberRole = async (groupId: string, memberUsername: string, role: 'admin' | 'member') => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberUsername}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to update member role:', err);
      return false;
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete group:', err);
      return false;
    }
  };

  return {
    groups,
    groupsRef,
    createGroup,
    removeMember,
    updateGroup,
    deleteGroup,
    addMemberToGroup,
    updateMemberRole,
    fetchGroups
  };
};
