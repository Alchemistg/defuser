import Peer, { type DataConnection } from 'peerjs';
import type {
  CreateRoomInput,
  GameActionInput,
  JoinRoomInput,
  RoomSettings,
  RoomState,
  UpdateRoomSettingsInput
} from '@defuser/shared';
import { ru } from '../locales/ru';
import { applyGameAction, assignRoles, createBomb, maskRoomForPlayer, refreshRoomState, type InternalRoom } from '../game/game-engine';

type SessionMeta = {
  roomId: string;
  playerId: string;
  name: string;
  roomCode: string;
  isHost: boolean;
};

type P2PMessage =
  | { type: 'hello'; name: string; playerId?: string }
  | { type: 'session'; playerId: string; room: RoomState }
  | { type: 'room_state'; room: RoomState }
  | { type: 'game_event'; message: string }
  | { type: 'action'; payload: GameActionInput }
  | { type: 'kicked'; message: string }
  | { type: 'sync_request'; playerId: string };

type Handlers = {
  onRoomState?: (room: RoomState) => void;
  onGameEvent?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
};

const STORAGE_HOST_ROOM = 'defuser.p2p.hostRoom';
const STORAGE_PEER_ROOM = 'defuser.p2p.peerRoom';
const STORAGE_META = 'defuser.p2p.meta';

const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const makeRoomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();

let peer: Peer | null = null;
let connections = new Map<string, DataConnection>();
let room: InternalRoom | null = null;
let session: SessionMeta | null = null;
let handlers: Handlers = {};
let tickHandle: number | null = null;
let connected = false;

const setConnected = (value: boolean) => {
  connected = value;
  handlers.onConnectionChange?.(value);
};

const persistMeta = (next: SessionMeta | null) => {
  if (!next) {
    localStorage.removeItem(STORAGE_META);
    return;
  }
  localStorage.setItem(STORAGE_META, JSON.stringify(next));
};

const persistHostRoom = () => {
  if (!room || !session?.isHost) {
    localStorage.removeItem(STORAGE_HOST_ROOM);
    return;
  }
  localStorage.setItem(STORAGE_HOST_ROOM, JSON.stringify(room));
};

const persistPeerRoom = (masked: RoomState | null) => {
  if (!masked || session?.isHost) {
    localStorage.removeItem(STORAGE_PEER_ROOM);
    return;
  }
  localStorage.setItem(STORAGE_PEER_ROOM, JSON.stringify(masked));
};

const loadHostRoom = (): InternalRoom | null => {
  try {
    const raw = localStorage.getItem(STORAGE_HOST_ROOM);
    return raw ? (JSON.parse(raw) as InternalRoom) : null;
  } catch {
    return null;
  }
};

const loadPeerRoom = (): RoomState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_PEER_ROOM);
    return raw ? (JSON.parse(raw) as RoomState) : null;
  } catch {
    return null;
  }
};

const loadMeta = (): SessionMeta | null => {
  try {
    const raw = localStorage.getItem(STORAGE_META);
    return raw ? (JSON.parse(raw) as SessionMeta) : null;
  } catch {
    return null;
  }
};

const ensureTick = () => {
  if (tickHandle || !session?.isHost) {
    return;
  }
  tickHandle = window.setInterval(() => {
    if (!room) {
      return;
    }
    if (refreshRoomState(room)) {
      persistHostRoom();
      broadcastRoomState(ru.messages.timeExpired);
    }
  }, 1000);
};

const clearTick = () => {
  if (tickHandle) {
    window.clearInterval(tickHandle);
    tickHandle = null;
  }
};

const peerOptions = () => {
  const host = (import.meta.env.VITE_PEER_HOST as string | undefined) ?? '0.peerjs.com';
  const port = Number(import.meta.env.VITE_PEER_PORT ?? 443);
  const secure = (import.meta.env.VITE_PEER_SECURE as string | undefined) ?? 'true';
  const path = (import.meta.env.VITE_PEER_PATH as string | undefined) ?? '/';
  return {
    host,
    port,
    secure: secure !== 'false',
    path
  };
};

const waitForPeerOpen = (instance: Peer) =>
  new Promise<string>((resolve, reject) => {
    const onOpen = (id: string) => {
      cleanup();
      resolve(id);
    };
    const onError = (error: unknown) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      instance.off('open', onOpen);
      instance.off('error', onError);
    };
    instance.on('open', onOpen);
    instance.on('error', onError);
  });

const ensureHostPeer = async (roomCode: string) => {
  if (peer && !peer.destroyed) {
    return peer;
  }

  peer = new Peer(roomCode, peerOptions());
  peer.on('connection', (conn) => {
    attachHostConnection(conn);
  });

  await waitForPeerOpen(peer);
  return peer;
};

const ensureClientPeer = async () => {
  if (peer && !peer.destroyed) {
    return peer;
  }

  peer = new Peer(undefined, peerOptions());
  await waitForPeerOpen(peer);
  return peer;
};

const sendToConnection = (conn: DataConnection, message: P2PMessage) => {
  if (conn.open) {
    conn.send(message);
  }
};

const emitLocalRoom = () => {
  if (!room || !session) {
    return;
  }
  const masked = maskRoomForPlayer(room, session.playerId);
  handlers.onRoomState?.(masked);
};

const broadcastRoomState = (eventMessage?: string) => {
  if (!room || !session) {
    return;
  }

  const hostMasked = maskRoomForPlayer(room, session.playerId);
  handlers.onRoomState?.(hostMasked);
  if (eventMessage) {
    handlers.onGameEvent?.(eventMessage);
  }

  for (const [playerId, conn] of connections.entries()) {
    const masked = maskRoomForPlayer(room, playerId);
    sendToConnection(conn, { type: 'room_state', room: masked });
    if (eventMessage) {
      sendToConnection(conn, { type: 'game_event', message: eventMessage });
    }
  }

  persistHostRoom();
};

const updatePresence = (playerId: string, isConnected: boolean) => {
  if (!room) {
    return;
  }
  const player = room.players.find((item) => item.id === playerId);
  if (!player || player.connected === isConnected) {
    return;
  }

  player.connected = isConnected;
  broadcastRoomState(isConnected ? ru.messages.playerBackOnline(player.name) : ru.messages.playerDisconnected(player.name));
};

const attachHostConnection = (conn: DataConnection) => {
  conn.on('data', (raw) => {
    const message = raw as P2PMessage;
    if (!room || !session?.isHost) {
      return;
    }

    if (message.type === 'hello') {
      if (room.players.length >= 2 && !message.playerId) {
        sendToConnection(conn, { type: 'game_event', message: ru.errors.roomFull });
        conn.close();
        return;
      }

      let playerId = message.playerId;
      let player = playerId ? room.players.find((item) => item.id === playerId) : undefined;

      if (!player) {
        playerId = randomId();
        player = {
          id: playerId,
          name: message.name.trim() || ru.defaults.randomNamePrefix,
          connected: true,
          joinedAt: Date.now()
        };
        room.players.push(player);
      } else {
        player.connected = true;
        if (message.name.trim()) {
          player.name = message.name.trim();
        }
      }

      const existing = connections.get(playerId);
      if (existing && existing !== conn) {
        existing.close();
      }
      connections.set(playerId, conn);
      sendToConnection(conn, { type: 'session', playerId, room: maskRoomForPlayer(room, playerId) });
      setConnected(true);
      broadcastRoomState();
      return;
    }

    if (message.type === 'action') {
      try {
        const result = applyGameAction(room, message.payload);
        broadcastRoomState(result.message);
      } catch (error) {
        handlers.onGameEvent?.(error instanceof Error ? error.message : ru.errors.gameInactive);
      }
      return;
    }

    if (message.type === 'sync_request') {
      const masked = maskRoomForPlayer(room, message.playerId);
      sendToConnection(conn, { type: 'room_state', room: masked });
    }
  });

  conn.on('close', () => {
    if (!room) {
      return;
    }
    const entry = [...connections.entries()].find(([, value]) => value === conn);
    if (entry) {
      const [playerId] = entry;
      connections.delete(playerId);
      updatePresence(playerId, false);
    }
    setConnected(connections.size > 0);
  });
};

const attachClientConnection = (conn: DataConnection, resolveSession: (value: { playerId: string; room: RoomState }) => void, rejectSession: (error: Error) => void, name: string, playerId?: string) => {
  const timeout = window.setTimeout(() => {
    rejectSession(new Error(ru.errors.roomNotFound));
  }, 5000);

  conn.on('open', () => {
    connections.set('host', conn);
    const payload: P2PMessage = { type: 'hello', name, playerId };
    conn.send(payload);
  });

  conn.on('data', (raw) => {
    const message = raw as P2PMessage;
    if (message.type === 'session') {
      window.clearTimeout(timeout);
      resolveSession({ playerId: message.playerId, room: message.room });
      setConnected(true);
      persistPeerRoom(message.room);
      handlers.onRoomState?.(message.room);
      return;
    }

    if (message.type === 'room_state') {
      handlers.onRoomState?.(message.room);
      persistPeerRoom(message.room);
      return;
    }

    if (message.type === 'game_event') {
      if (message.message === ru.errors.roomFull || message.message === ru.errors.roomNotFound) {
        window.clearTimeout(timeout);
        rejectSession(new Error(message.message));
        conn.close();
        return;
      }
      handlers.onGameEvent?.(message.message);
      return;
    }

    if (message.type === 'kicked') {
      handlers.onGameEvent?.(message.message);
      resetP2P();
      return;
    }
  });

  conn.on('close', () => {
    connections.delete('host');
    setConnected(false);
  });

  conn.on('error', () => {
    connections.delete('host');
    setConnected(false);
  });
};

export const registerP2PHandlers = (next: Handlers) => {
  handlers = next;
  if (room && session) {
    emitLocalRoom();
  } else {
    const cached = loadPeerRoom();
    if (cached) {
      handlers.onRoomState?.(cached);
    }
  }
  handlers.onConnectionChange?.(connected);
};

export const getP2PConnected = () => connected;

export const createRoomSession = async (input: CreateRoomInput) => {
  const playerId = randomId();
  const now = Date.now();
  const code = makeRoomCode();

  room = {
    id: randomId(),
    code,
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
        name: input.name.trim() || ru.defaults.randomNamePrefix,
        connected: true,
        joinedAt: now
      }
    ]
  };

  session = {
    roomId: room.id,
    playerId,
    name: input.name.trim() || ru.defaults.randomNamePrefix,
    roomCode: code,
    isHost: true
  };

  persistMeta(session);
  persistHostRoom();
  await ensureHostPeer(code);
  ensureTick();
  emitLocalRoom();

  return {
    playerId,
    room: maskRoomForPlayer(room, playerId)
  };
};

export const joinRoomSession = async (input: JoinRoomInput) => {
  const peerInstance = await ensureClientPeer();
  const conn = peerInstance.connect(input.roomCode.trim().toUpperCase(), { reliable: true });

  const result = await new Promise<{ playerId: string; room: RoomState }>((resolve, reject) => {
    attachClientConnection(conn, resolve, reject, input.name);
  });

  session = {
    roomId: result.room.id,
    playerId: result.playerId,
    name: input.name.trim() || ru.defaults.randomNamePrefix,
    roomCode: input.roomCode.trim().toUpperCase(),
    isHost: false
  };
  persistMeta(session);
  return {
    playerId: result.playerId,
    room: result.room
  };
};

export const fetchRoomState = async (_roomId: string, _playerId: string) => {
  const meta = loadMeta();
  if (!meta) {
    throw new Error(ru.errors.roomNotFound);
  }

  session = meta;

  if (meta.isHost) {
    if (!room) {
      room = loadHostRoom();
    }
    if (!room) {
      throw new Error(ru.errors.roomNotFound);
    }
    room.players = room.players.map((player) =>
      player.id === meta.playerId ? { ...player, connected: true } : { ...player, connected: false }
    );
    await ensureHostPeer(meta.roomCode);
    ensureTick();
    emitLocalRoom();
    return { room: maskRoomForPlayer(room, meta.playerId) };
  }

  try {
    const peerInstance = await ensureClientPeer();
    const conn = peerInstance.connect(meta.roomCode, { reliable: true });

    const result = await new Promise<{ playerId: string; room: RoomState }>((resolve, reject) => {
      attachClientConnection(conn, resolve, reject, meta.name, meta.playerId);
    });

    session.playerId = result.playerId;
    persistMeta(session);
    return { room: result.room };
  } catch {
    const cached = loadPeerRoom();
    if (cached) {
      return { room: cached };
    }
    throw new Error(ru.errors.roomNotFound);
  }
};

export const startRoomGame = async (roomId: string, playerId: string) => {
  if (!room || room.id !== roomId || room.ownerId !== playerId) {
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
  broadcastRoomState(ru.messages.gameStarted);

  return { room: maskRoomForPlayer(room, playerId) };
};

export const restartRoomGame = async (roomId: string, playerId: string) => {
  if (!room || room.id !== roomId || room.ownerId !== playerId) {
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

  broadcastRoomState(ru.messages.roundRestarted);

  return { room: maskRoomForPlayer(room, playerId) };
};

export const updateRoomSettings = async (payload: UpdateRoomSettingsInput) => {
  if (!room || room.id !== payload.roomId || room.ownerId !== payload.playerId) {
    throw new Error(ru.errors.ownerOnlySettings);
  }
  if (room.status !== 'lobby') {
    throw new Error(ru.errors.settingsLobbyOnly);
  }

  const fallbackTypes = room.settings.moduleTypes ?? ['wires', 'button', 'toggles', 'symbols', 'lamps', 'disk'];
  const nextModuleTypes =
    payload.settings.moduleTypes && payload.settings.moduleTypes.length > 0 ? payload.settings.moduleTypes : fallbackTypes;

  room.settings = {
    durationMs: payload.settings.durationMs,
    modulesCount: payload.settings.modulesCount,
    moduleTypes: Array.from(new Set(nextModuleTypes))
  };

  broadcastRoomState(ru.messages.settingsUpdated);

  return { room: maskRoomForPlayer(room, payload.playerId) };
};

export const sendAction = (payload: GameActionInput) => {
  if (!session) {
    return;
  }

  if (session.isHost) {
    if (!room) {
      return;
    }
    try {
      const result = applyGameAction(room, payload);
      broadcastRoomState(result.message);
    } catch (error) {
      handlers.onGameEvent?.(error instanceof Error ? error.message : ru.errors.gameInactive);
    }
    return;
  }

  const conn = connections.get('host');
  if (conn) {
    sendToConnection(conn, { type: 'action', payload });
  }
};

export const kickPlayer = (roomId: string, playerId: string, targetPlayerId: string) => {
  if (!room || room.id !== roomId || room.ownerId !== playerId) {
    throw new Error(ru.errors.ownerOnlySettings);
  }
  if (room.status !== 'lobby') {
    throw new Error(ru.errors.settingsLobbyOnly);
  }
  if (targetPlayerId === playerId) {
    return;
  }

  const target = room.players.find((player) => player.id === targetPlayerId);
  if (!target) {
    return;
  }

  room.players = room.players.filter((player) => player.id !== targetPlayerId);
  const conn = connections.get(targetPlayerId);
  if (conn) {
    sendToConnection(conn, { type: 'kicked', message: ru.messages.kickedSelf });
    conn.close();
    connections.delete(targetPlayerId);
  }

  broadcastRoomState(ru.messages.playerKicked(target.name));
};

export const resetP2P = () => {
  room = null;
  session = null;
  connections.clear();
  setConnected(false);
  persistMeta(null);
  persistHostRoom();
  persistPeerRoom(null);
  clearTick();

  if (peer && !peer.destroyed) {
    peer.destroy();
  }
  peer = null;
};

export const getSessionMeta = () => session;
export const getRoomSettings = () => room?.settings ?? null;
export const getRoomCode = () => room?.code ?? session?.roomCode ?? '';

export const updateRoomSettingsLocal = (settings: RoomSettings) => {
  if (!room) {
    return;
  }
  room.settings = settings;
  persistHostRoom();
};
