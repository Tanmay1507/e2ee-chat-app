'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface User {
  id: string;
  username: string;
  publicKey: string;
  isOnline?: boolean;
  department?: string;
  role?: string;
}

export const useUsers = (socket: Socket | null, username: string | null) => {
  const [users, setUsers] = useState<User[]>([]);
  const usersRef = useRef<User[]>([]);

  const fetchUsers = useCallback(async () => {
    if (!username) return;
    const normalizedUsername = username.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((u: any) => u.username.trim().toLowerCase() !== normalizedUsername);
        setUsers(filtered);
        usersRef.current = filtered;
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [username]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!socket || !username) return;

    const normalizedUsername = username.trim().toLowerCase();

    const handleUserList = (userList: User[]) => {
      const filtered = userList.filter(u => u.username.trim().toLowerCase() !== normalizedUsername);
      setUsers(filtered);
      usersRef.current = filtered;
    };

    socket.on('user-list', handleUserList);

    return () => {
      socket.off('user-list', handleUserList);
    };
  }, [socket, username]);

  return {
    users,
    usersRef,
    fetchUsers
  };
};
