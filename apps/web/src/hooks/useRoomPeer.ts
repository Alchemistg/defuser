import { useEffect, useState } from 'react';
import type { GameActionInput, RoomState } from '@defuser/shared';
import { getP2PConnected, registerP2PHandlers, sendAction } from '../lib/p2p-room';

export const useRoomPeer = (
  roomId: string | null,
  playerId: string | null,
  onRoomState: (room: RoomState) => void,
  onGameEvent: (message: string) => void
) => {
  const [connected, setConnected] = useState(getP2PConnected());

  useEffect(() => {
    if (!roomId || !playerId) {
      return;
    }

    registerP2PHandlers({
      onRoomState,
      onGameEvent,
      onConnectionChange: setConnected
    });
  }, [onGameEvent, onRoomState, playerId, roomId]);

  const performAction = (payload: GameActionInput) => {
    sendAction(payload);
  };

  return {
    connected,
    sendAction: performAction
  };
};
