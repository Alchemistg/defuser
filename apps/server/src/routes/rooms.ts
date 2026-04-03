import type { FastifyInstance } from 'fastify';
import type { CreateRoomInput, JoinRoomInput, StartGameInput, UpdateRoomSettingsInput } from '@defuser/shared';
import { RoomService } from '../services/room-service.js';
import { ru } from '../locales/ru.js';

export const registerRoomRoutes = async (app: FastifyInstance, roomService: RoomService) => {
  app.post('/api/rooms', async (request, reply) => {
    try {
      const session = roomService.createRoom(request.body as CreateRoomInput);
      return session;
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : ru.routes.createRoomFail });
    }
  });

  app.post('/api/rooms/join', async (request, reply) => {
    try {
      const session = roomService.joinRoom(request.body as JoinRoomInput);
      return session;
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : ru.routes.joinRoomFail });
    }
  });

  app.post('/api/rooms/start', async (request, reply) => {
    try {
      const body = request.body as StartGameInput;
      return { room: roomService.startGame(body.roomId, body.playerId) };
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : ru.routes.startGameFail });
    }
  });

  app.post('/api/rooms/restart', async (request, reply) => {
    try {
      const body = request.body as StartGameInput;
      return { room: roomService.restartGame(body.roomId, body.playerId) };
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : ru.routes.restartGameFail });
    }
  });

  app.post('/api/rooms/settings', async (request, reply) => {
    try {
      const body = request.body as UpdateRoomSettingsInput;
      return { room: roomService.updateSettings(body) };
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : ru.routes.updateSettingsFail });
    }
  });

  app.get('/api/rooms/:roomId', async (request, reply) => {
    try {
      const params = request.params as { roomId: string };
      const query = request.query as { playerId?: string };
      if (!query.playerId) {
        return reply.code(400).send({ message: ru.routes.playerIdRequired });
      }

      return { room: roomService.getRoomForPlayer(params.roomId, query.playerId) };
    } catch (error) {
      return reply.code(404).send({ message: error instanceof Error ? error.message : ru.routes.roomNotFound });
    }
  });
};
