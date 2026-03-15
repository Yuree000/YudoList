const { readdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = join(__dirname, '..');
const clientDir = join(rootDir, 'node_modules', '.prisma', 'client');

if (process.platform === 'win32') {
  for (const entry of readdirSync(clientDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.startsWith('query_engine-windows.dll.node')) {
      rmSync(join(clientDir, entry.name), { force: true });
    }
  }
}

const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npx';
const args = isWindows ? ['/d', '/s', '/c', 'npx prisma generate'] : ['prisma', 'generate'];

const result = spawnSync(command, args, {
  cwd: rootDir,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
