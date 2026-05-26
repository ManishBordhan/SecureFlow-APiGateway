import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = () => {
  const socketRef               = useRef(null);
  const [connected, setConnected] = useState(false);
  const [traffic,   setTraffic]   = useState([]);
  const [abuse,     setAbuse]     = useState([]);

  useEffect(() => {
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('connect', () => {
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current.on('traffic', (data) => {
      setTraffic((prev) => [data, ...prev].slice(0, 50));
    });

    socketRef.current.on('abuse', (data) => {
      setAbuse((prev) => [data, ...prev].slice(0, 30));
    });

    socketRef.current.on('rateLimit', (data) => {
      setTraffic((prev) => [{ ...data, statusCode: 429 }, ...prev].slice(0, 50));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return { connected, traffic, abuse };
};

export default useSocket;