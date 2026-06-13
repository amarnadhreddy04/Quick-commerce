import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => tester.close(() => resolve(false)))
      .listen(port, '127.0.0.1');
  });
}

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

const gatewayPort = Number(process.env.GATEWAY_PORT || 3001);
const orderPort = Number(process.env.ORDER_PORT || 3013);

if (await isPortInUse(gatewayPort) || await isPortInUse(orderPort)) {
  console.error(
    `\nPachari API ports are already in use (${gatewayPort}, ${orderPort}, ...).`
  );
  console.error('Run "npm run server:restart" from the project root, or stop the old terminal with Ctrl+C.\n');
  process.exit(1);
}

services.forEach((service) => startService(service));

function shutdown() {
  children.forEach((child) => child.kill('SIGTERM'));
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
