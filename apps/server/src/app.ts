import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerHealthRoute } from './routes/health.js';
import { registerRoomRoutes } from './routes/rooms.js';
import { RoomService } from './services/room-service.js';

export const buildApp = async (roomService: RoomService) => {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await registerHealthRoute(app);
  await registerRoomRoutes(app, roomService);

  return app;
};
