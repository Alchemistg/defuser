import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { SOCKET_EVENTS, type ClientToServerEvents, type ServerToClientEvents } from '@defuser/shared';
import { RoomService } from '../services/room-service.js';

export const registerRealtime = (server: HttpServer, roomService: RoomService) => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  const subscriptions = new Map<string, { roomId: string; playerId: string }>();

  const emitMaskedRoom = (roomId: string, playerId: string, socketId: string) => {
    try {
      const room = roomService.getRoomForPlayer(roomId, playerId);
      io.to(socketId).emit(SOCKET_EVENTS.roomState, room);
    } catch {
      // Ignore stale subscriptions.
    }
  };

  roomService.setBroadcaster((roomId, eventMessage) => {
    for (const [socketId, subscription] of subscriptions.entries()) {
      if (subscription.roomId === roomId) {
        emitMaskedRoom(roomId, subscription.playerId, socketId);
        if (eventMessage) {
          io.to(socketId).emit(SOCKET_EVENTS.gameEvent, eventMessage);
        }
      }
    }
  });

  io.on('connection', (socket) => {
    socket.on(SOCKET_EVENTS.subscribeRoom, ({ roomId, playerId }) => {
      subscriptions.set(socket.id, { roomId, playerId });
      roomService.markPresence(roomId, playerId, true);
      emitMaskedRoom(roomId, playerId, socket.id);
    });

    socket.on(SOCKET_EVENTS.performAction, (payload) => {
      try {
        roomService.performAction(payload);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.gameEvent, error instanceof Error ? error.message : 'Не удалось выполнить действие');
      }
    });

    socket.on('disconnect', () => {
      const subscription = subscriptions.get(socket.id);
      if (subscription) {
        roomService.markPresence(subscription.roomId, subscription.playerId, false);
        subscriptions.delete(socket.id);
      }
    });
  });

  return io;
};
