import { randomUUID } from 'node:crypto';
import type { CreateRoomInput, GameActionInput, JoinRoomInput, RoomState, UpdateRoomSettingsInput } from '@defuser/shared';
import { AppDatabase } from '../db/database.js';
import { applyGameAction, assignRoles, createBomb, type InternalRoom, maskRoomForPlayer, refreshRoomState } from '../game/game-engine.js';
import { ru } from '../locales/ru.js';

type Broadcaster = (roomId: string, eventMessage?: string) => void;

const makeRoomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();

export class RoomService {
  private readonly rooms = new Map<string, InternalRoom>();
  private broadcaster: Broadcaster = () => undefined;

  constructor(private readonly database: AppDatabase) {}

  setBroadcaster(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
  }

  createRoom(input: CreateRoomInput) {
    const playerId = randomUUID();
    const now = Date.now();

    const room: InternalRoom = {
      id: randomUUID(),
      code: makeRoomCode(),
      status: 'lobby',
      createdAt: now,
      ownerId: playerId,
      settings: {
        durationMs: 180000,
        modulesCount: 3,
        moduleTypes: ['wires', 'button', 'toggles', 'symbols', 'lamps', 'disk']
      },
      players: [
        {
          id: playerId,
          name: input.name.trim() || ru.defaults.playerName,
          connected: true,
          joinedAt: now
        }
      ]
    };

    this.rooms.set(room.id, room);
    this.database.saveRoom(room);
    this.database.recordEvent(room.id, playerId, 'room_created', { name: input.name });
    this.broadcaster(room.id);

    return {
      playerId,
      room: maskRoomForPlayer(room, playerId)
    } satisfies { playerId: string; room: RoomState };
  }

  joinRoom(input: JoinRoomInput) {
    const room = [...this.rooms.values()].find((item) => item.code === input.roomCode.trim().toUpperCase());
    if (!room) {
      throw new Error(ru.errors.roomNotFound);
    }
    if (room.players.length >= 2) {
      throw new Error(ru.errors.roomFull);
    }

    const playerId = randomUUID();
    room.players.push({
      id: playerId,
      name: input.name.trim() || ru.defaults.playerNameSecond,
      connected: true,
      joinedAt: Date.now()
    });

    this.database.saveRoom(room);
    this.database.recordEvent(room.id, playerId, 'room_joined', { name: input.name });
    this.broadcaster(room.id);

    return {
      playerId,
      room: maskRoomForPlayer(room, playerId)
    } satisfies { playerId: string; room: RoomState };
  }

  getRoomForPlayer(roomId: string, playerId: string) {
    const room = this.requireRoom(roomId);
    return maskRoomForPlayer(room, playerId);
  }

  startGame(roomId: string, playerId: string) {
    const room = this.requireRoom(roomId);
    if (room.ownerId !== playerId) {
      throw new Error(ru.errors.ownerOnlyStart);
    }
    if (room.players.length < 2) {
      throw new Error(ru.errors.needSecondPlayerStart);
    }
    if (room.status !== 'lobby') {
      throw new Error(ru.errors.gameAlreadyStarted);
    }

    assignRoles(room.players);
    room.bomb = createBomb(room.settings);
    room.status = 'active';

    this.database.saveRoom(room);
    this.database.recordEvent(room.id, playerId, 'game_started', { roomId });
    this.broadcaster(room.id, ru.messages.gameStarted);

    return maskRoomForPlayer(room, playerId);
  }

  restartGame(roomId: string, playerId: string) {
    const room = this.requireRoom(roomId);
    if (room.ownerId !== playerId) {
      throw new Error(ru.errors.ownerOnlyRestart);
    }
    if (room.players.length < 2) {
      throw new Error(ru.errors.needSecondPlayerRestart);
    }

    room.status = 'lobby';
    room.bomb = undefined;
    room.players = room.players.map((player) => ({
      ...player,
      role: undefined
    }));

    this.database.saveRoom(room);
    this.database.recordEvent(room.id, playerId, 'game_restarted', { roomId });
    this.broadcaster(room.id, ru.messages.roundRestarted);

    return maskRoomForPlayer(room, playerId);
  }

  updateSettings(input: UpdateRoomSettingsInput) {
    const room = this.requireRoom(input.roomId);
    if (room.ownerId !== input.playerId) {
      throw new Error(ru.errors.ownerOnlySettings);
    }
    if (room.status !== 'lobby') {
      throw new Error(ru.errors.settingsLobbyOnly);
    }

    const fallbackTypes = room.settings.moduleTypes ?? ['wires', 'button', 'toggles', 'symbols', 'lamps', 'disk'];
    const nextModuleTypes =
      input.settings.moduleTypes && input.settings.moduleTypes.length > 0 ? input.settings.moduleTypes : fallbackTypes;

    room.settings = {
      durationMs: input.settings.durationMs,
      modulesCount: input.settings.modulesCount,
      moduleTypes: Array.from(new Set(nextModuleTypes))
    };

    this.database.saveRoom(room);
    this.database.recordEvent(room.id, input.playerId, 'settings_updated', room.settings);
    this.broadcaster(room.id, ru.messages.settingsUpdated);

    return maskRoomForPlayer(room, input.playerId);
  }

  performAction(payload: GameActionInput) {
    const room = this.requireRoom(payload.roomId);
    const result = applyGameAction(room, payload);

    this.database.saveRoom(room);
    this.database.recordEvent(room.id, payload.playerId, 'player_action', payload);
    this.broadcaster(room.id, result.message);

    return {
      room: maskRoomForPlayer(room, payload.playerId),
      message: result.message
    };
  }

  markPresence(roomId: string, playerId: string, connected: boolean) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const player = room.players.find((item) => item.id === playerId);
    if (!player || player.connected === connected) {
      return;
    }

    player.connected = connected;
    this.database.saveRoom(room);
    this.broadcaster(
      roomId,
      connected ? ru.messages.playerBackOnline(player.name) : ru.messages.playerDisconnected(player.name)
    );
  }

  tick() {
    for (const room of this.rooms.values()) {
      if (refreshRoomState(room)) {
        this.database.saveRoom(room);
        this.broadcaster(room.id, ru.messages.timeExpired);
      }
    }
  }

  private requireRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(ru.errors.roomNotFound);
    }

    return room;
  }
}
