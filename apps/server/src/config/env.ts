import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = dirname(fileURLToPath(import.meta.url));

const resolveEnvPath = () => {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
    resolve(currentDir, '../../../../.env'),
    resolve(currentDir, '../../../../../../.env')
  ];

  return candidates.find((candidate) => existsSync(candidate));
};

const envPath = resolveEnvPath();

dotenv.config(envPath ? { path: envPath } : undefined);

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPortFromUrl = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  try {
    const url = new URL(value);
    if (url.port) {
      return toNumber(url.port, fallback);
    }

    return url.protocol === 'https:' ? 443 : 80;
  } catch {
    return fallback;
  }
};

const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';

export const env = {
  publicBaseUrl,
  port: toNumber(process.env.PORT, toPortFromUrl(publicBaseUrl, 3000)),
  nodeEnv: process.env.NODE_ENV ?? 'development'
};
