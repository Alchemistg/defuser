import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class AppDatabase {
  private readonly db: DatabaseSync;

  constructor() {
    const serverDir = join(process.cwd(), 'apps', 'server');
    const legacyDir = join(serverDir, 'data');
    const storageDir = join(serverDir, 'storage');
    const legacyDbPath = join(legacyDir, 'defuser.sqlite');
    const storageDbPath = join(storageDir, 'defuser.sqlite');

    mkdirSync(storageDir, { recursive: true });

    // Migrate the local SQLite file from the old `data` directory to `storage`.
    if (!existsSync(storageDbPath) && existsSync(legacyDbPath)) {
      renameSync(legacyDbPath, storageDbPath);
    }

    this.db = new DatabaseSync(storageDbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS room_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        player_id TEXT,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  saveRoom(room: { id: string; code: string; status: string; createdAt: number }) {
    const now = Date.now();
    this.db
      .prepare(
        `
          INSERT INTO rooms (id, code, status, payload, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            code = excluded.code,
            status = excluded.status,
            payload = excluded.payload,
            updated_at = excluded.updated_at
        `
      )
      .run(room.id, room.code, room.status, JSON.stringify(room), room.createdAt, now);
  }

  recordEvent(roomId: string, playerId: string | null, eventType: string, payload: unknown) {
    this.db
      .prepare(
        `
          INSERT INTO room_events (room_id, player_id, event_type, payload, created_at)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(roomId, playerId, eventType, JSON.stringify(payload), Date.now());
  }
}
