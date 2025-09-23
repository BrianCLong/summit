import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';

export default function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = getSocket();
    if (s) setSocket(s);
  }, []);

  return socket;
}

