import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'production';
const { build, preview } = await import('vite');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let building = false;
let pending = false;
let debounceTimer = null;

async function rebuild(clean = false) {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  try {
    await build({
      root,
      logLevel: clean ? 'info' : 'warn',
      build: { emptyOutDir: clean },
    });
  } catch (error) {
    console.error('[protected-web] Build error:', error instanceof Error ? error.message : error);
  } finally {
    building = false;
    if (pending) {
      pending = false;
      void rebuild(false);
    }
  }
}

await rebuild(true);

const server = await preview({ root });
server.printUrls();

const watchTargets = [path.join(root, 'src'), path.join(root, 'index.html')];
const watchers = watchTargets
  .filter((target) => fs.existsSync(target))
  .map((target) =>
    fs.watch(target, { recursive: fs.statSync(target).isDirectory() }, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void rebuild(false), 250);
    }),
  );

function shutdown() {
  for (const w of watchers) w.close();
  void server.close().finally(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
