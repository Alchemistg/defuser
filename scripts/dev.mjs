import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const run = (label, scriptName) => {
  const child = spawn(`${npmCommand} run ${scriptName}`, {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      DEFUSER_PROCESS_LABEL: label
    }
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] stopped by signal ${signal}`);
      return;
    }

    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
};

const children = [
  run('server', 'dev:server'),
  run('web', 'dev:web')
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 150);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Starting Defuser dev stack: backend + frontend');
