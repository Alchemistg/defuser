export type Role = 'sapper' | 'coordinator';
export type RoomStatus = 'lobby' | 'active' | 'defused' | 'exploded';
export type ModuleType = 'wires' | 'button' | 'toggles' | 'symbols' | 'lamps' | 'disk';

export interface RoomSettings {
  durationMs: number;
  modulesCount: number;
  moduleTypes: ModuleType[];
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface PlayerState extends PlayerProfile {
  role?: Role;
  connected: boolean;
  joinedAt: number;
}

export interface ModuleActionOption {
  action: 'cut-wire' | 'hold-button' | 'tap-toggle';
  label: string;
  value?: string;
}

export interface BombModule {
  id: string;
  type: ModuleType;
  label: string;
  solved: boolean;
  mode: Role;
  lines: string[];
  actions: ModuleActionOption[];
}

export interface BombState {
  serial: string;
  strikes: number;
  maxStrikes: number;
  startedAt: number;
  durationMs: number;
  modules: BombModule[];
}

export interface RoomState {
  id: string;
  code: string;
  status: RoomStatus;
  createdAt: number;
  ownerId: string;
  players: PlayerState[];
  settings: RoomSettings;
  bomb?: BombState;
}

export interface CreateRoomInput {
  name: string;
}

export interface JoinRoomInput {
  roomCode: string;
  name: string;
}

export interface StartGameInput {
  roomId: string;
  playerId: string;
}

export interface UpdateRoomSettingsInput {
  roomId: string;
  playerId: string;
  settings: RoomSettings;
}

export interface GameActionInput {
  roomId: string;
  playerId: string;
  moduleId: string;
  action: 'cut-wire' | 'hold-button' | 'tap-toggle';
  value?: string;
}

export interface SessionResponse {
  playerId: string;
  room: RoomState;
}

export interface ServerToClientEvents {
  room_state: (room: RoomState) => void;
  game_event: (message: string) => void;
}

export interface ClientToServerEvents {
  subscribe_room: (payload: { roomId: string; playerId: string }) => void;
  perform_action: (payload: GameActionInput) => void;
}

export const SOCKET_EVENTS = {
  subscribeRoom: 'subscribe_room',
  performAction: 'perform_action',
  roomState: 'room_state',
  gameEvent: 'game_event'
} as const;
