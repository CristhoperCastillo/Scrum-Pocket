import { io, Socket } from 'socket.io-client';
import { api } from './api';

export function connectGame(): Socket {
  return io(`${process.env.NEXT_PUBLIC_WS_URL}/game`, {
    auth: (cb) => cb({ token: api.getAccessToken() ?? '' }),
    transports: ['websocket'],
  });
}
