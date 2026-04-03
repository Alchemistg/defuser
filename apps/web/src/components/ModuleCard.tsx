import type { BombModule, GameActionInput, ModuleType } from '@defuser/shared';
import { ru } from '../locales/ru';

interface ModuleCardProps {
  module: BombModule;
  disabled: boolean;
  onAction: (moduleId: string, action: GameActionInput['action'], value?: string) => void;
}

const moduleTypeLabels: Record<ModuleType, string> = ru.module.labels;

const parseSymbols = (lines: string[]) => {
  const line = lines.find((item) => item.includes(ru.module.parsing.symbolsOrderPrefix)) ?? '';
  const match = line.split(':')[1];
  if (!match) {
    return [];
  }
  return match
    .replace('.', '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
};

const parseLitLamps = (lines: string[]) => {
  const line = lines.find((item) => item.includes(ru.module.parsing.lampsLitPrefix)) ?? '';
  const matches = line.match(/\d+/g);
  return matches ? matches.map((value) => Number(value)) : [];
};

const parseDiskPosition = (lines: string[]) => {
  const line = lines.find((item) => item.includes(ru.module.parsing.diskHoursWord)) ?? '';
  const match = line.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const parseButtonMeta = (lines: string[], label: string) => {
  const joined = lines.join(' ').toLowerCase();
  let color: 'red' | 'blue' = 'red';

  if (joined.includes(ru.module.parsing.blueHint)) {
    color = 'blue';
  } else if (joined.includes(ru.module.parsing.redHint)) {
    color = 'red';
  } else if (label.includes('A')) {
    color = 'blue';
  } else if (label.includes('B')) {
    color = 'red';
  }

  const textLine = lines.find((item) => /HOLD|WAIT/i.test(item));
  const textMatch = textLine?.match(/(HOLD|WAIT)/i);
  const labelMatch = label.match(/A|B/);
  const text = textMatch?.[1]?.toUpperCase() ?? (labelMatch?.[0] === 'A' ? 'HOLD' : 'WAIT');

  return { color, text };
};

const ModuleVisual = ({ module }: { module: BombModule }) => {
  const type = module.type;
  if (module.type === 'symbols') {
    const symbols = parseSymbols(module.lines);
    return (
      <div className="grid grid-cols-4 gap-2 text-center text-xl text-amber-100">
        {symbols.length > 0
          ? symbols.map((symbol) => (
              <div key={symbol} className="rounded-xl border border-white/10 bg-black/40 py-2">
                {symbol}
              </div>
            ))
          : new Array(4).fill(0).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-black/40 py-2">
                ?
              </div>
            ))}
      </div>
    );
  }

  if (module.type === 'lamps') {
    const lit = parseLitLamps(module.lines);
    return (
      <div className="flex items-center justify-between gap-2">
        {new Array(5).fill(0).map((_, index) => {
          const lampIndex = index + 1;
          const isLit = lit.includes(lampIndex);
          return (
            <div
              key={lampIndex}
              className={`h-6 w-6 rounded-full ${isLit ? 'lamp-glow' : 'bg-zinc-800'}`}
            />
          );
        })}
      </div>
    );
  }

  if (module.type === 'disk') {
    const position = parseDiskPosition(module.lines);
    const rotationMap: Record<number, number> = { 12: 0, 3: 90, 6: 180, 9: 270 };
    const rotation = position ? rotationMap[position] ?? 0 : 0;

    return (
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/40">
        <div className="h-2 w-2 rounded-full bg-amber-200" />
        <div
          className="absolute top-1 left-1/2 h-8 w-1 -translate-x-1/2 rounded-full bg-rose-300"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, transformOrigin: 'bottom center' }}
        />
      </div>
    );
  }

  if (type === 'wires') {
    return (
      <div className="grid grid-cols-3 gap-2">
        <div className="h-3 rounded-full bg-rose-400/80 shadow-[0_0_12px_rgba(248,113,113,0.6)]" />
        <div className="h-3 rounded-full bg-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
        <div className="h-3 rounded-full bg-amber-300/80 shadow-[0_0_12px_rgba(252,211,77,0.6)]" />
        <div className="h-3 rounded-full bg-zinc-200/80 shadow-[0_0_12px_rgba(228,228,231,0.6)]" />
        <div className="h-3 rounded-full bg-emerald-300/80 shadow-[0_0_12px_rgba(110,231,183,0.6)]" />
        <div className="h-3 rounded-full bg-zinc-800/90 shadow-[0_0_12px_rgba(24,24,27,0.6)]" />
        <div className="col-span-3 mt-3 flex items-center justify-between rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-300">
          <span>{ru.module.scanner}</span>
          <span className="soft-flicker h-2 w-2 rounded-full bg-emerald-300" />
        </div>
      </div>
    );
  }

  if (type === 'button') {
    const { color, text } = parseButtonMeta(module.lines, module.label);
    const buttonClass =
      color === 'blue'
        ? 'bg-sky-400/80 shadow-[0_0_22px_rgba(56,189,248,0.7)]'
        : 'bg-rose-500/80 shadow-[0_0_22px_rgba(244,63,94,0.7)]';

    return (
      <div className="flex items-center justify-center">
        <div className={`pulse-glow flex h-20 w-20 items-center justify-center rounded-full ${buttonClass}`}>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900">{text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {['up', 'down', 'up'].map((direction, index) => (
        <div
          key={`${direction}-${index}`}
          className={`flex h-14 w-10 items-center justify-center rounded-2xl border border-white/10 ${
            direction === 'up' ? 'bg-emerald-400/20' : 'bg-slate-700/40'
          }`}
        >
          <div className={`h-6 w-2 rounded-full ${direction === 'up' ? 'bg-emerald-300' : 'bg-slate-300'}`} />
        </div>
      ))}
      <div className="flex h-14 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/40">
        <span className="soft-flicker h-2 w-2 rounded-full bg-amber-200" />
      </div>
    </div>
  );
};

export const ModuleCard = ({ module, disabled, onAction }: ModuleCardProps) => (
  <article className="panel panel-module signal-grid flex h-full flex-col gap-5 p-5 shadow-panel">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="chip-label">{moduleTypeLabels[module.type] ?? module.type}</div>
        <h3 className="mt-2 font-display text-2xl font-semibold text-white">{module.label}</h3>
      </div>
      <span className={`status-pill ${module.solved ? 'status-ok' : 'status-warn'}`}>
        {module.solved ? ru.module.status.ready : module.mode === 'sapper' ? ru.module.status.panel : ru.module.status.guide}
      </span>
    </div>

    {module.mode === 'sapper' ? (
      <div className="panel panel-inset p-4">
        <ModuleVisual module={module} />
      </div>
    ) : null}

    {module.mode !== 'sapper' ? (
      <div className="rule-block">
        <div className="chip-label">{ru.module.guideLabel}</div>
        <div className="rule-list">
          {module.lines.map((line) => (
            <p key={line} className="rule-line">
              {line}
            </p>
          ))}
        </div>
      </div>
    ) : null}

    {module.actions.length > 0 ? (
      <div className="mt-auto flex flex-wrap gap-3 pt-2">
        {module.actions.map((action) => (
          <button
            key={`${module.id}-${action.action}-${action.value ?? 'plain'}`}
            type="button"
            disabled={disabled || module.solved}
            onClick={() => onAction(module.id, action.action, action.value)}
            className="btn btn-outline"
          >
            {action.label}
          </button>
        ))}
      </div>
    ) : null}
  </article>
);
