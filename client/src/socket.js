
import { io } from 'socket.io-client';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:9000/api';

const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {},
});

export const connectSocket = (token) => {
  if (!token) {
    throw new Error('Authentication token is missing.');
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
};

socket.on('connect_error', (error) => {
  console.error('Socket connection failed:', error.message);
});

export default socket;
