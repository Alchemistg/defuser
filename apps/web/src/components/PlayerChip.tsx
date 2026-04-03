import type { PlayerState } from '@defuser/shared';
import { ru } from '../locales/ru';

interface PlayerChipProps {
  player: PlayerState;
  current: boolean;
}

export const PlayerChip = ({ player, current }: PlayerChipProps) => (
  <div className="panel panel-muted flex items-center justify-between gap-4 px-4 py-3">
    <div>
      <div className="font-display text-lg font-semibold text-white">
        {player.name}
        {current ? ru.player.you : ''}
      </div>
      <div className="text-sm text-zinc-200">{player.role ? ru.role.names[player.role] : ru.player.rolePending}</div>
    </div>
    <span className={`status-pill ${player.connected ? 'status-ok' : 'status-wait'}`}>
      {player.connected ? ru.player.online : ru.player.offline}
    </span>
  </div>
);
