import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Only establish a connection pipe if an authorized session is active
    if (!user) return;

    const serverUrl = import.meta.env.VITE_SERVER_URL ? 
      import.meta.env.VITE_SERVER_URL.replace('/api', '') : 
      'http://localhost:5000';

    const socketInstance = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket']
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);