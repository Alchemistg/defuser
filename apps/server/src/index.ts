import { buildApp } from './app.js';
import { env } from './config/env.js';
import { AppDatabase } from './db/database.js';
import { registerRealtime } from './realtime/socket.js';
import { RoomService } from './services/room-service.js';

const main = async () => {
  const database = new AppDatabase();
  const roomService = new RoomService(database);
  const app = await buildApp(roomService);
  registerRealtime(app.server, roomService);

  setInterval(() => {
    roomService.tick();
  }, 1000).unref();

  await app.listen({ port: env.port, host: '0.0.0.0' });
  console.log(`Server ready at ${env.publicBaseUrl}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
