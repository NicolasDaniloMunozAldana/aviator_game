import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (serverUrl) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      forceNew: true,
      reconnection: true,
      timeout: 20000,
      upgrade: true
    });

    newSocket.on('connect', () => {
      console.log('Conectado al servidor de juego');
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Error de conexión:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [serverUrl]);

  return socket;
};