import type { FastifyInstance } from 'fastify';

export const registerHealthRoute = async (app: FastifyInstance) => {
  app.get('/api/health', async () => ({ ok: true }));
};
