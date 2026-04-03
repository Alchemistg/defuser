import type { CreateRoomInput, JoinRoomInput, SessionResponse, UpdateRoomSettingsInput } from '@defuser/shared';
import {
  createRoomSession as createRoomSessionP2P,
  fetchRoomState as fetchRoomStateP2P,
  joinRoomSession as joinRoomSessionP2P,
  resetP2P,
  restartRoomGame as restartRoomGameP2P,
  startRoomGame as startRoomGameP2P,
  updateRoomSettings as updateRoomSettingsP2P
} from './p2p-room';

export const createRoomSession = (input: CreateRoomInput) =>
  createRoomSessionP2P(input) as Promise<SessionResponse>;

export const joinRoomSession = (input: JoinRoomInput) =>
  joinRoomSessionP2P(input) as Promise<SessionResponse>;

export const startRoomGame = (roomId: string, playerId: string) =>
  startRoomGameP2P(roomId, playerId) as Promise<{ room: SessionResponse['room'] }>;

export const restartRoomGame = (roomId: string, playerId: string) =>
  restartRoomGameP2P(roomId, playerId) as Promise<{ room: SessionResponse['room'] }>;

export const updateRoomSettings = (payload: UpdateRoomSettingsInput) =>
  updateRoomSettingsP2P(payload) as Promise<{ room: SessionResponse['room'] }>;

export const fetchRoomState = (roomId: string, playerId: string) =>
  fetchRoomStateP2P(roomId, playerId) as Promise<{ room: SessionResponse['room'] }>;

export const resetRoomConnection = () => resetP2P();
