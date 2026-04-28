import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER = process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:4000';

export const useSocket = (username: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!username) return;

    const token = localStorage.getItem('chat_token');
    const newSocket = io(SOCKET_SERVER, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: { token }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, [username]);

  return { socket, isConnected };
};
