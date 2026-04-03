import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameActionInput, ModuleType, Role, RoomState } from '@defuser/shared';
import { ModuleCard } from './components/ModuleCard';
import { PlayerChip } from './components/PlayerChip';
import { useRoomPeer } from './hooks/useRoomPeer';
import {
  createRoomSession,
  fetchRoomState,
  joinRoomSession,
  kickPlayer,
  resetRoomConnection,
  restartRoomGame,
  startRoomGame,
  updateRoomSettings
} from './lib/api';
import { playClick, playError, playSuccess } from './lib/sfx';
import { ru } from './locales/ru';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface Session {
  roomId: string;
  playerId: string;
  name: string;
  roomCode?: string;
  isHost?: boolean;
}

interface SettingsDraft {
  durationMs: number;
  modulesCount: number;
  moduleTypes: ModuleType[];
}

const sessionKey = 'defuser.session';
const nameKey = 'defuser.name';

const randomName = () => `${ru.defaults.randomNamePrefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const readStoredSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

const persistSession = (session: Session | null) => {
  if (!session) {
    localStorage.removeItem(sessionKey);
    return;
  }

  localStorage.setItem(sessionKey, JSON.stringify(session));
};

const resolveBootstrap = () => {
  const url = new URL(window.location.href);
  const stored = readStoredSession();
  const storedName = localStorage.getItem(nameKey) ?? '';

  return {
    defaultName: stored?.name ?? storedName || randomName(),
    defaultCode: url.searchParams.get('roomCode')?.toUpperCase() ?? stored?.roomCode ?? '',
    session: stored
  };
};

const formatTimer = (secondsLeft: number) => {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const roleAccent: Record<Role, string> = {
  sapper: 'text-amber-300',
  coordinator: 'text-sky-300'
};

const resultBanner = {
  defused: {
    title: ru.results.defusedTitle,
    body: ru.results.defusedBody,
    className: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
  },
  exploded: {
    title: ru.results.explodedTitle,
    body: ru.results.explodedBody,
    className: 'border-rose-300/30 bg-rose-400/10 text-rose-100'
  }
} as const;

const moduleTypeOptions: { value: ModuleType; label: string }[] = (
  ['wires', 'button', 'toggles', 'symbols', 'lamps', 'disk'] as const
).map((value) => ({
  value,
  label: ru.module.labels[value]
}));

const defaultModuleTypes: ModuleType[] = moduleTypeOptions.map((option) => option.value);

const normalizeSettings = (room: RoomState): SettingsDraft => ({
  ...room.settings,
  moduleTypes: room.settings.moduleTypes?.length ? room.settings.moduleTypes : defaultModuleTypes
});

const buildInviteLink = (roomCode: string) => {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('roomCode', roomCode);
  return url.toString();
};

export default function App() {
  const bootstrap = useMemo(resolveBootstrap, []);
  const [session, setSession] = useState<Session | null>(bootstrap.session);
  const [name, setName] = useState(bootstrap.defaultName);
  const [roomCode, setRoomCode] = useState(bootstrap.defaultCode);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [message, setMessage] = useState<string>(ru.messages.default);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [strikeFlashTick, setStrikeFlashTick] = useState(0);
  const prevStrikesRef = useRef<number | null>(null);
  const [reconnectPulse, setReconnectPulse] = useState(0);
  const [finalSecondsLeft, setFinalSecondsLeft] = useState<number | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  useEffect(() => {
    persistSession(session);
  }, [session]);

  useEffect(() => {
    if (name.trim()) {
      localStorage.setItem(nameKey, name.trim());
    }
  }, [name]);

  const handleRoomState = useCallback((nextRoom: RoomState) => {
    setRoom(nextRoom);
    setSettingsDraft((current) => current ?? normalizeSettings(nextRoom));
    setError(null);
  }, []);

  const resetSessionWithNotice = (notice: string) => {
    setSession(null);
    setRoom(null);
    setError(null);
    setSettingsDraft(null);
    setMessage(notice);
    resetRoomConnection();
    persistSession(null);
  };

  const handleGameEvent = useCallback((nextMessage: string) => {
    if (nextMessage === ru.messages.kickedSelf) {
      resetSessionWithNotice(ru.messages.kickedSelf);
      return;
    }
    if (nextMessage.includes('обезврежен') || nextMessage.includes('спасена')) {
      playSuccess();
    }
    if (nextMessage.startsWith('Ошибка') || nextMessage.includes('Критическая')) {
      playError();
    }
    setMessage(nextMessage);
  }, []);

  const { connected, sendAction } = useRoomPeer(session?.roomId ?? null, session?.playerId ?? null, handleRoomState, handleGameEvent);

  useEffect(() => {
    if (!room?.bomb || room.status !== 'active') {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [room?.bomb, room?.status]);

  useEffect(() => {
    if (!room?.bomb) {
      setFinalSecondsLeft(null);
      return;
    }

    if (room.status === 'active') {
      setFinalSecondsLeft(null);
      return;
    }

    const remaining = Math.max(0, Math.ceil((room.bomb.startedAt + room.bomb.durationMs - Date.now()) / 1000));
    setFinalSecondsLeft(remaining);
  }, [room?.bomb, room?.status]);

  useEffect(() => {
    const strikes = room?.bomb?.strikes;
    if (strikes === undefined) {
      prevStrikesRef.current = null;
      setStrikeFlashTick(0);
      return;
    }

    const prev = prevStrikesRef.current;
    if (prev !== null && strikes > prev) {
      setStrikeFlashTick((tick) => tick + 1);
      playError();
      vibrate(80);
    }

    prevStrikesRef.current = strikes;
  }, [room?.bomb?.strikes]);

  useEffect(() => {
    if (room?.status !== 'active') {
      setStrikeFlashTick(0);
    }
  }, [room?.status]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchRoomState(session.roomId, session.playerId)
      .then((payload) => {
        if (!cancelled) {
          setRoom(payload.room);
          setSettingsDraft(normalizeSettings(payload.room));
          setMessage(ru.messages.roomLoaded);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : ru.errors.roomLoad);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (connected || !session) {
      return;
    }
    const timer = window.setInterval(() => {
      setReconnectPulse((value) => value + 1);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [connected, session]);

  const currentPlayer = room?.players.find((player) => player.id === session?.playerId);
  const currentRole = currentPlayer?.role;
  const secondsLeft = room?.bomb ? Math.max(0, Math.ceil((room.bomb.startedAt + room.bomb.durationMs - now) / 1000)) : null;
  const timeSpentSeconds =
    room?.bomb && finalSecondsLeft !== null
      ? Math.max(0, Math.ceil(room.bomb.durationMs / 1000) - finalSecondsLeft)
      : null;
  const isOwner = Boolean(session && room && room.ownerId === session.playerId);
  const canStart = Boolean(room && room.status === 'lobby' && room.players.length >= 2 && isOwner);
  const finishedBanner = room && (room.status === 'defused' || room.status === 'exploded') ? resultBanner[room.status] : null;
  const selectedModuleTypes = settingsDraft?.moduleTypes ?? defaultModuleTypes;
  const inviteLink = room ? buildInviteLink(room.code) : '';

  const submitCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const trimmedName = name.trim() || randomName();
      const response = await createRoomSession({ name: trimmedName });
      const nextSession: Session = {
        roomId: response.room.id,
        playerId: response.playerId,
        name: trimmedName,
        roomCode: response.room.code,
        isHost: true
      };

      setName(trimmedName);
      setSession(nextSession);
      setRoom(response.room);
      setSettingsDraft(normalizeSettings(response.room));
      setMessage(ru.messages.roomCreated);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : ru.errors.roomCreate);
    } finally {
      setLoading(false);
    }
  };

  const submitJoin = async () => {
    setLoading(true);
    setError(null);

    try {
      const trimmedName = name.trim() || randomName();
      const response = await joinRoomSession({ roomCode, name: trimmedName });
      const nextSession: Session = {
        roomId: response.room.id,
        playerId: response.playerId,
        name: trimmedName,
        roomCode: response.room.code,
        isHost: false
      };

      setName(trimmedName);
      setSession(nextSession);
      setRoom(response.room);
      setSettingsDraft(normalizeSettings(response.room));
      setMessage(ru.messages.joinSuccess);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : ru.errors.roomJoin);
    } finally {
      setLoading(false);
    }
  };

  const submitStart = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await startRoomGame(session.roomId, session.playerId);
      setRoom(response.room);
      setMessage(ru.messages.startSuccess);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : ru.errors.gameStart);
    } finally {
      setLoading(false);
    }
  };

  const submitSettings = async () => {
    if (!session || !room || !settingsDraft) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await updateRoomSettings({
        roomId: room.id,
        playerId: session.playerId,
        settings: settingsDraft
      });
      setRoom(response.room);
      setSettingsDraft(normalizeSettings(response.room));
      setMessage(ru.messages.settingsSaved);
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : ru.errors.settings);
    } finally {
      setLoading(false);
    }
  };

  const submitRestart = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await restartRoomGame(session.roomId, session.playerId);
      setRoom(response.room);
      setSettingsDraft(normalizeSettings(response.room));
      setMessage(ru.messages.restartReady);
    } catch (restartError) {
      setError(restartError instanceof Error ? restartError.message : ru.errors.restart);
    } finally {
      setLoading(false);
    }
  };

  const submitAction = (moduleId: string, action: GameActionInput['action'], value?: string) => {
    if (!session) {
      return;
    }

    playClick();
    vibrate(20);
    sendAction({
      roomId: session.roomId,
      playerId: session.playerId,
      moduleId,
      action,
      value
    });
  };

  const copyInvite = async () => {
    if (!inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage(ru.messages.inviteCopied);
    } catch {
      setError(ru.messages.inviteCopyFail);
    }
  };

  const shareInvite = async () => {
    if (!inviteLink) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: ru.app.title,
          text: ru.room.inviteShareText,
          url: inviteLink
        });
        setMessage(ru.room.inviteShared);
        return;
      } catch {
        // fall back to clipboard
      }
    }

    await copyInvite();
  };

  const handleKickPlayer = async (targetPlayerId: string) => {
    if (!session || !room) {
      return;
    }

    try {
      kickPlayer(room.id, session.playerId, targetPlayerId);
      setMessage(ru.room.kickSuccess);
    } catch (kickError) {
      setError(kickError instanceof Error ? kickError.message : ru.room.kickFail);
    }
  };

  const resetSession = () => {
    setSession(null);
    setRoom(null);
    setError(null);
    setSettingsDraft(null);
    setMessage(ru.messages.sessionReset);
    resetRoomConnection();
    persistSession(null);
  };

  useEffect(() => {
    if (!session || !room) {
      return;
    }
    const stillInRoom = room.players.some((player) => player.id === session.playerId);
    if (!stillInRoom) {
      resetSessionWithNotice(ru.messages.kickedSelf);
    }
  }, [room, session]);

  const isActive = room?.status === 'active';

  return (
    <main className={`app-shell ${isActive ? 'is-active' : 'is-idle'} min-h-screen px-4 py-6 text-white sm:px-6 lg:px-10`}>
      <div className="app-atmosphere" aria-hidden="true" />
      {offlineReady || needRefresh ? (
        <div className="fixed right-4 top-4 z-50 w-[min(24rem,calc(100%-2rem))]">
          <div className="panel panel-muted p-4 shadow-panel">
            <div className="chip-label">{ru.pwa.label}</div>
            <div className="mt-2 text-sm text-zinc-100">{needRefresh ? ru.pwa.updateReady : ru.pwa.offlineReady}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {needRefresh ? (
                <button type="button" onClick={() => updateServiceWorker(true)} className="btn btn-primary">
                  {ru.pwa.refresh}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setOfflineReady(false);
                  setNeedRefresh(false);
                }}
                className="btn btn-outline"
              >
                {ru.pwa.dismiss}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {strikeFlashTick > 0 ? <div key={strikeFlashTick} className="strike-flash" aria-hidden="true" /> : null}
      {room?.bomb && isActive ? (
        <div className={`hud-timer ${room.status === 'active' ? 'is-active' : 'is-dimmed'}`}>
          <div className="hud-label">{ru.hud.timer}</div>
          <div className="hud-value">{secondsLeft !== null ? formatTimer(secondsLeft) : '--:--'}</div>
          <div className="hud-meta">{ru.hud.strikes}: {room.bomb.strikes}/{room.bomb.maxStrikes}</div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="panel panel-hero overflow-hidden shadow-panel">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:p-8">
            <div className="space-y-5">
              <div className="inline-flex rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100">
                {ru.app.badge}
              </div>
              <div>
                <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{ru.app.title}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg">
                  {ru.app.subtitle}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="panel panel-muted p-4">
                  <div className="chip-label">{ru.app.modeLabel}</div>
                  <div className="mt-2 font-display text-xl">{ru.app.modeValue}</div>
                </div>
                <div className="panel panel-muted p-4">
                  <div className="chip-label">{ru.app.sessionLabel}</div>
                  <div className="mt-2 font-display text-xl">{ru.app.sessionValue}</div>
                </div>
                <div className="panel panel-muted p-4">
                  <div className="chip-label">{ru.app.formatLabel}</div>
                  <div className="mt-2 font-display text-xl">{ru.app.formatValue}</div>
                </div>
              </div>
            </div>

            <div className="panel panel-scan flex flex-col gap-4 p-5">
              <div className="chip-label">{ru.status.label}</div>
              <div className="font-display text-2xl">{room ? ru.status.roomStates[room.status] : ru.status.ready}</div>
              <div className="flex flex-wrap gap-3 text-sm text-zinc-200">
                <span className={`status-pill ${connected ? 'status-ok' : 'status-wait'}`}>
                  {ru.status.socketPrefix} {connected ? ru.status.socketConnected : ru.status.socketWaiting}
                </span>
                {!connected && session ? (
                  <span key={reconnectPulse} className="status-pill status-reconnect">
                    {ru.status.reconnecting}
                  </span>
                ) : null}
              </div>
              <div className="panel panel-inset p-4 text-sm leading-6 text-zinc-100">{message}</div>
              {error ? <div className="panel panel-alert p-4 text-sm text-rose-100">{error}</div> : null}
            </div>
          </div>
        </section>

        {!session || !room ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="panel panel-cta p-6 shadow-panel">
              <h2 className="font-display text-2xl font-semibold">{ru.lobby.createTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{ru.lobby.createHint}</p>
              <label className="mt-6 block text-sm text-zinc-300">
                {ru.lobby.nameLabel}
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-zinc-500 focus:border-amber-300/60"
                  placeholder={ru.lobby.namePlaceholderCreate}
                />
              </label>
              <button type="button" onClick={submitCreate} disabled={loading || !name.trim()} className="btn btn-primary mt-5 w-full">
                {loading ? ru.lobby.createButtonLoading : ru.lobby.createButton}
              </button>
            </div>

            <div className="panel panel-muted p-6 shadow-panel">
              <h2 className="font-display text-2xl font-semibold">{ru.lobby.joinTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{ru.lobby.joinHint}</p>
              <div className="mt-6 grid gap-4">
                <label className="block text-sm text-zinc-300">
                  {ru.lobby.nameLabel}
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-sky-300/60"
                    placeholder={ru.lobby.namePlaceholderJoin}
                  />
                </label>
                <label className="block text-sm text-zinc-300">
                  {ru.lobby.codeLabel}
                  <input
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-sky-300/60"
                    placeholder={ru.lobby.codePlaceholder}
                    maxLength={4}
                  />
                </label>
              </div>
              <button type="button" onClick={submitJoin} disabled={loading || !name.trim() || roomCode.trim().length < 4} className="btn btn-secondary mt-5 w-full">
                {loading ? ru.lobby.joinButtonLoading : ru.lobby.joinButton}
              </button>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <aside className="space-y-6">
              <div className="panel panel-muted p-6 shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="chip-label">{ru.room.label}</div>
                    <div className="mt-2 font-display text-4xl">{room.code}</div>
                  </div>
                  <button type="button" onClick={resetSession} className="btn btn-outline">
                    {ru.room.leave}
                  </button>
                </div>

                <div className="mt-5 panel panel-inset p-4">
                  <div className="chip-label">{ru.room.inviteLabel}</div>
                  <input readOnly value={inviteLink} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 outline-none" />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={copyInvite} className="btn btn-secondary w-full">
                      {ru.room.inviteCopy}
                    </button>
                    <button type="button" onClick={shareInvite} className="btn btn-outline w-full">
                      {ru.room.inviteShare}
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {room.players.map((player) => (
                    <PlayerChip
                      key={player.id}
                      player={player}
                      current={player.id === session.playerId}
                      canKick={isOwner && room.status === 'lobby' && player.id !== session.playerId}
                      onKick={handleKickPlayer}
                    />
                  ))}
                </div>
              </div>

              <div className="panel panel-role p-6 shadow-panel">
                <div className="chip-label">{ru.role.label}</div>
                <div className={`mt-3 font-display text-3xl font-semibold ${currentRole ? roleAccent[currentRole] : 'text-zinc-100'}`}>
                  {currentRole ? ru.role.names[currentRole] : ru.role.pending}
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-200">
                  {currentRole === 'sapper'
                    ? ru.role.sapper
                    : currentRole === 'coordinator'
                      ? ru.role.coordinator
                      : ru.role.unknown}
                </p>
              </div>

              {room.status === 'lobby' ? (
                <div className="panel panel-muted p-6 shadow-panel">
                  <div className="font-display text-2xl">{ru.lobbySettings.title}</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">{ru.lobbySettings.hint}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-zinc-300">
                      {ru.lobbySettings.durationLabel}
                      <select
                        value={settingsDraft?.durationMs ?? 180000}
                        disabled={!isOwner || loading}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            durationMs: Number(event.target.value),
                            modulesCount: current?.modulesCount ?? 3,
                            moduleTypes: current?.moduleTypes ?? defaultModuleTypes
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 disabled:opacity-60"
                      >
                        <option value={120000}>{ru.lobbySettings.duration2}</option>
                        <option value={180000}>{ru.lobbySettings.duration3}</option>
                        <option value={240000}>{ru.lobbySettings.duration4}</option>
                        <option value={300000}>{ru.lobbySettings.duration5}</option>
                      </select>
                    </label>
                    <label className="block text-sm text-zinc-300">
                      {ru.lobbySettings.modulesLabel}
                      <select
                        value={settingsDraft?.modulesCount ?? 3}
                        disabled={!isOwner || loading}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            durationMs: current?.durationMs ?? 180000,
                            modulesCount: Number(event.target.value),
                            moduleTypes: current?.moduleTypes ?? defaultModuleTypes
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 disabled:opacity-60"
                      >
                        <option value={3}>{ru.lobbySettings.modules3}</option>
                        <option value={4}>{ru.lobbySettings.modules4}</option>
                        <option value={5}>{ru.lobbySettings.modules5}</option>
                        <option value={6}>{ru.lobbySettings.modules6}</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <div className="text-sm text-zinc-300">{ru.lobbySettings.moduleTypesLabel}</div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-3">
                        {moduleTypeOptions.map((option) => {
                          const checked = selectedModuleTypes.includes(option.value);
                          const disableUncheck = checked && selectedModuleTypes.length === 1;

                          return (
                            <label
                              key={option.value}
                              className={`flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-zinc-200 transition ${
                                checked ? 'bg-emerald-400/10' : 'bg-white/5'
                              } ${!isOwner || loading ? 'opacity-60' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!isOwner || loading || disableUncheck}
                                onChange={() =>
                                  setSettingsDraft((current) => {
                                    const currentTypes = current?.moduleTypes ?? defaultModuleTypes;
                                    const nextTypes = checked
                                      ? currentTypes.filter((type) => type !== option.value)
                                      : [...currentTypes, option.value];
                                    const orderedTypes = moduleTypeOptions
                                      .map((item) => item.value)
                                      .filter((value) => nextTypes.includes(value));

                                    return {
                                      durationMs: current?.durationMs ?? 180000,
                                      modulesCount: current?.modulesCount ?? 3,
                                      moduleTypes: orderedTypes.length > 0 ? orderedTypes : currentTypes
                                    };
                                  })
                                }
                                className="h-4 w-4 accent-emerald-300"
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">{ru.lobbySettings.moduleTypesHint}</p>
                    </div>
                  </div>

                  {isOwner ? (
                    <button type="button" onClick={submitSettings} disabled={loading || !settingsDraft} className="btn btn-outline mt-4 w-full">
                      {loading ? ru.lobbySettings.saveSettingsLoading : ru.lobbySettings.saveSettings}
                    </button>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-400">{ru.lobbySettings.ownerOnly}</p>
                  )}

                  <button type="button" onClick={submitStart} disabled={!canStart || loading} className="btn btn-primary mt-5 w-full">
                    {loading ? ru.lobbySettings.startGameLoading : canStart ? ru.lobbySettings.startGame : ru.lobbySettings.waitPlayer}
                  </button>
                </div>
              ) : null}
            </aside>

            <section className="space-y-6">
              {finishedBanner ? (
                <div className={`rounded-3xl border p-6 shadow-panel ${finishedBanner.className}`}>
                  <div className="chip-label">{ru.results.label}</div>
                  <div className="mt-3 font-display text-3xl font-semibold">{finishedBanner.title}</div>
                  <p className="mt-3 text-sm leading-6 opacity-90">{finishedBanner.body}</p>
                  {room?.bomb ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="panel panel-inset px-4 py-3">
                        <div className="chip-label">{ru.results.time}</div>
                      <div className="font-display text-2xl">
                        {timeSpentSeconds !== null ? formatTimer(timeSpentSeconds) : '--:--'}
                      </div>
                      </div>
                      <div className="panel panel-inset px-4 py-3">
                        <div className="chip-label">{ru.results.strikes}</div>
                        <div className="font-display text-2xl">{room.bomb.strikes}/{room.bomb.maxStrikes}</div>
                      </div>
                    </div>
                  ) : null}
                  {isOwner ? (
                    <button type="button" onClick={submitRestart} disabled={loading} className="btn btn-outline mt-5">
                      {loading ? ru.results.rematchLoading : ru.results.rematch}
                    </button>
                  ) : (
                    <p className="mt-5 text-sm opacity-80">{ru.results.ownerStarts}</p>
                  )}
                </div>
              ) : null}

              <div className="panel panel-muted p-6 shadow-panel">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="chip-label">{ru.bomb.label}</div>
                    <div className="mt-2 font-display text-3xl">
                      {room.bomb ? `${ru.bomb.serialPrefix} ${room.bomb.serial}` : ru.bomb.notReady}
                    </div>
                  </div>
                </div>
              </div>

              {room.bomb ? (
                <div className="grid gap-5 xl:grid-cols-2">
                  {room.bomb.modules.map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      disabled={room.status !== 'active' || currentRole !== 'sapper'}
                      onAction={submitAction}
                    />
                  ))}
                </div>
              ) : (
                <div className="panel panel-muted flex min-h-64 items-center justify-center p-8 text-center text-zinc-200 shadow-panel">
                  {ru.bomb.emptyHint}
                </div>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
