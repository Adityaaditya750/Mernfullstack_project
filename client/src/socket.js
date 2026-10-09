import { io } from 'socket.io-client';

const socket = io('http://localhost:9000', {
  autoConnect: false,
  auth: {},
});

socket.on('connect_error', (error) => {
  console.error('Socket connection failed:', error.message);
});

export default socket;