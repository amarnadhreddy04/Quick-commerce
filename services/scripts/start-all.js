import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const services = [
  { name: 'sync', script: 'sync-service/src/index.js' },
  { name: 'notifications', script: 'notification-service/src/index.js' },
  { name: 'auth', script: 'auth-service/src/index.js' },
  { name: 'catalog', script: 'catalog-service/src/index.js' },
  { name: 'orders', script: 'order-service/src/index.js' },
  { name: 'payments', script: 'payment-service/src/index.js' },
  { name: 'users', script: 'user-service/src/index.js' },
  { name: 'settings', script: 'settings-service/src/index.js' },
  { name: 'gateway', script: 'gateway/src/index.js' },
];

const children = [];

function startService(service) {
  const child = spawn('node', [service.script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${service.name}] exited with code ${code}`);
    }
  });

  children.push(child);
  return child;
}

services.forEach((service) => startService(service));

function shutdown() {
  children.forEach((child) => child.kill('SIGTERM'));
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
