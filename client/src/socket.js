
import { io } from 'socket.io-client';

const socket = io('http://localhost:9000', {
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
