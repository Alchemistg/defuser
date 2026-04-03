import { randomUUID } from 'node:crypto';
import type { BombModule, GameActionInput, ModuleActionOption, PlayerState, Role, RoomState } from '@defuser/shared';
import { ru } from '../locales/ru.js';

export interface InternalBombModule {
  id: string;
  type: BombModule['type'];
  label: string;
  solved: boolean;
  sapperLines: string[];
  coordinatorLines: string[];
  actions: ModuleActionOption[];
  solution: {
    action: GameActionInput['action'];
    value?: string;
  };
}

export interface InternalBombState {
  serial: string;
  strikes: number;
  maxStrikes: number;
  startedAt: number;
  durationMs: number;
  modules: InternalBombModule[];
}

export interface InternalRoom {
  id: string;
  code: string;
  status: RoomState['status'];
  createdAt: number;
  ownerId: string;
  players: PlayerState[];
  settings: RoomState['settings'];
  bomb?: InternalBombState;
}

const sample = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;

const uniqueSample = <T>(items: readonly T[], count: number): T[] => {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0] as T);
  }
  return result;
};

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const createSymbolsModule = (): InternalBombModule => {
  const symbols = uniqueSample(['Ω', 'Ψ', 'Ж', '★', '◆', '✓', '∑', '¶'], 4);
  const starIndex = symbols.findIndex((symbol) => symbol === '★');
  const solutionIndex = starIndex >= 0 ? starIndex : 1;
  const text = ru.module.text.symbols;

  return buildModule({
    label: text.label,
    sapperLines: [text.sapperIntro, text.sapperOrder(symbols)],
    coordinatorLines: [...text.coordinatorLines],
    actions: text.actions.map((label, index) => ({
      action: 'tap-toggle',
      label,
      value: String(index)
    })),
    solution: { action: 'tap-toggle', value: String(solutionIndex) },
    typeOverride: 'symbols'
  });
};

const createLampsModule = (): InternalBombModule => {
  const lampCount = Math.random() > 0.5 ? 3 : 2;
  const lit = uniqueSample([1, 2, 3, 4, 5], lampCount).sort((a, b) => a - b);
  const solutionIndex = lampCount === 3 ? 2 : 0;
  const text = ru.module.text.lamps;

  return buildModule({
    label: text.label,
    sapperLines: [text.sapperIntro, text.sapperLit(lit)],
    coordinatorLines: [...text.coordinatorLines],
    actions: text.actions.map((label, index) => ({
      action: 'tap-toggle',
      label,
      value: String(index)
    })),
    solution: { action: 'tap-toggle', value: String(solutionIndex) },
    typeOverride: 'lamps'
  });
};

const createDiskModule = (): InternalBombModule => {
  const positions = [12, 3, 6, 9] as const;
  const position = sample(positions);
  const solutionMap: Record<(typeof positions)[number], string> = {
    12: 'D',
    3: 'L',
    6: 'U',
    9: 'R'
  };
  const text = ru.module.text.disk;

  return buildModule({
    label: text.label,
    sapperLines: [text.sapperIntro, text.sapperPosition(position)],
    coordinatorLines: [...text.coordinatorLines],
    actions: [
      { action: 'tap-toggle', label: text.actions.up, value: 'U' },
      { action: 'tap-toggle', label: text.actions.down, value: 'D' },
      { action: 'tap-toggle', label: text.actions.left, value: 'L' },
      { action: 'tap-toggle', label: text.actions.right, value: 'R' }
    ],
    solution: { action: 'tap-toggle', value: solutionMap[position] },
    typeOverride: 'disk'
  });
};

const buildModule = (template: {
  label: string;
  sapperLines: readonly string[];
  coordinatorLines: readonly string[];
  actions: readonly ModuleActionOption[];
  solution: { action: GameActionInput['action']; value?: string };
  typeOverride?: BombModule['type'];
}): InternalBombModule => ({
  id: randomUUID(),
  type:
    template.typeOverride ??
    (template.solution.action === 'cut-wire'
      ? 'wires'
      : template.solution.action === 'hold-button'
        ? 'button'
        : 'toggles'),
  label: template.label,
  solved: false,
  sapperLines: [...template.sapperLines],
  coordinatorLines: shuffle([...template.coordinatorLines]),
  actions: [...template.actions],
  solution: template.solution
});

const makeSerial = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const createBomb = (settings: RoomState['settings']): InternalBombState => {
  const modulesCount = clamp(Math.round(settings.modulesCount), 3, 6);
  const durationMs = clamp(Math.round(settings.durationMs), 60000, 900000);

  const fallbackTypes: InternalBombModule['type'][] = ['wires', 'button', 'toggles', 'symbols', 'lamps', 'disk'];
  const allowedTypes =
    settings.moduleTypes && settings.moduleTypes.length > 0
      ? Array.from(new Set(settings.moduleTypes))
      : fallbackTypes;

  const moduleFactory: Record<InternalBombModule['type'], () => InternalBombModule> = {
    wires: () => buildModule(sample(ru.module.templates.wires)),
    button: () => buildModule(sample(ru.module.templates.button)),
    toggles: () => buildModule(sample(ru.module.templates.toggles)),
    symbols: createSymbolsModule,
    lamps: createLampsModule,
    disk: createDiskModule
  };

  const modules = new Array(modulesCount).fill(0).map(() => moduleFactory[sample(allowedTypes)]());

  return {
    serial: makeSerial(),
    strikes: 0,
    maxStrikes: 3,
    startedAt: Date.now(),
    durationMs,
    modules
  };
};

export const refreshRoomState = (room: InternalRoom) => {
  if (room.status !== 'active' || !room.bomb) {
    return false;
  }

  const expired = Date.now() - room.bomb.startedAt >= room.bomb.durationMs;
  if (expired) {
    room.status = 'exploded';
    return true;
  }

  return false;
};

export const assignRoles = (players: PlayerState[]) => {
  const shuffled = [...players].sort(() => (Math.random() > 0.5 ? 1 : -1));
  shuffled[0].role = 'sapper';
  shuffled[1].role = 'coordinator';
};

export const maskRoomForPlayer = (room: InternalRoom, playerId: string): RoomState => {
  refreshRoomState(room);

  const player = room.players.find((item) => item.id === playerId);
  const role: Role = player?.role ?? 'sapper';

  return {
    id: room.id,
    code: room.code,
    status: room.status,
    createdAt: room.createdAt,
    ownerId: room.ownerId,
    players: room.players,
    settings: room.settings,
    bomb: room.bomb
      ? {
          serial: room.bomb.serial,
          strikes: room.bomb.strikes,
          maxStrikes: room.bomb.maxStrikes,
          startedAt: room.bomb.startedAt,
          durationMs: room.bomb.durationMs,
          modules: room.bomb.modules.map((module) => ({
            id: module.id,
            type: module.type,
            label: module.label,
            solved: module.solved,
            mode: role,
            lines: role === 'sapper' ? module.sapperLines : module.coordinatorLines,
            actions: role === 'sapper' && !module.solved ? module.actions : []
          }))
        }
      : undefined
  };
};

export const applyGameAction = (room: InternalRoom, payload: GameActionInput) => {
  refreshRoomState(room);

  const player = room.players.find((item) => item.id === payload.playerId);
  if (!player) {
    throw new Error(ru.errors.playerNotFound);
  }
  if (player.role !== 'sapper') {
    throw new Error(ru.errors.onlySapper);
  }
  if (room.status !== 'active' || !room.bomb) {
    throw new Error(ru.errors.gameInactive);
  }

  const module = room.bomb.modules.find((item) => item.id === payload.moduleId);
  if (!module) {
    throw new Error(ru.errors.moduleNotFound);
  }
  if (module.solved) {
    return { changed: false, message: ru.messages.moduleAlreadyDefused };
  }

  const isCorrect = module.solution.action === payload.action && (module.solution.value ?? '') === (payload.value ?? '');

  if (isCorrect) {
    module.solved = true;
    const completed = room.bomb.modules.every((item) => item.solved);
    if (completed) {
      room.status = 'defused';
      return { changed: true, message: ru.messages.moduleDefusedBombSaved(module.label) };
    }

    return { changed: true, message: ru.messages.moduleDefused(module.label) };
  }

  room.bomb.strikes += 1;
  if (room.bomb.strikes >= room.bomb.maxStrikes) {
    room.status = 'exploded';
    return { changed: true, message: ru.messages.criticalError };
  }

  return {
    changed: true,
    message: ru.messages.remainingAttempts(room.bomb.maxStrikes - room.bomb.strikes)
  };
};
