/**
 * Dev launcher for the Electron desktop surface.
 *
 * Bundles `src/electron/main.ts` to a temporary `.electron-main.mjs` at the
 * project root with the programmatic esbuild API (strict ESM, `--packages=external`,
 * sourcemap), resolves the `electron` binary, and spawns it pointing at the
 * bundle. Direct IPC + `loadFile()` only — NO embedded Express server and NO
 * `--port`. The temp bundle (and its sourcemap) is cleaned up on every exit path.
 *
 * Conventions honoured:
 * - esbuild is a vetted devDependency: there is NO install-on-miss fallback. If
 *   it is absent the launcher fails loudly (no-silent-fallback rule).
 * - the main process resolves its resources (`preload.cjs`, `public/index.html`)
 *   via Electron path APIs against `app.getAppPath()` in dev, so the temp bundle
 *   location does not affect resource resolution — but Electron is spawned with
 *   `cwd = projectRoot` so the app path matches the source tree.
 * - the renderer (`public/app.js`) is compiled before launch so the loaded UI
 *   works; `tsx` runs this file directly, so it needs no pre-compilation.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const moduleFilename = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(moduleFilename);
const require = createRequire(import.meta.url);

/** Project root: two levels up from `src/electron/`. */
const PROJECT_ROOT = path.resolve(moduleDir, '..', '..');
const ELECTRON_MAIN_TS = path.join(moduleDir, 'main.ts');
const TEMP_BUNDLE = path.join(PROJECT_ROOT, '.electron-main.mjs');
const TEMP_BUNDLE_MAP = `${TEMP_BUNDLE}.map`;
const RENDERER_TSCONFIG = path.join(moduleDir, 'tsconfig.renderer.json');

function removeTempBundle(): void {
  for (const file of [TEMP_BUNDLE, TEMP_BUNDLE_MAP]) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* best-effort cleanup */
    }
  }
}

/**
 * Compile the renderer TypeScript (`public/app.ts` → `public/app.js`) so the
 * `file://`-loaded UI has its script available in dev. Runs the project's
 * TypeScript compiler against the renderer tsconfig. Fails loudly on error.
 */
function buildRenderer(): void {
  const tscBin = require.resolve('typescript/bin/tsc');
  const result = spawnSync(process.execPath, [tscBin, '-p', RENDERER_TSCONFIG], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(
      `Renderer build failed (tsc -p ${RENDERER_TSCONFIG} exited with code ${result.status ?? 'null'}).`,
    );
  }
}

/**
 * Dev entry point: build the renderer, esbuild-bundle the main process to a
 * temp `.mjs`, then spawn Electron against it. Resolves when the spawned
 * Electron process exits (the process then mirrors its exit code).
 */
export async function launchElectronApp(): Promise<void> {
  buildRenderer();

  console.log('Bundling Electron main process…');
  await build({
    entryPoints: [ELECTRON_MAIN_TS],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: TEMP_BUNDLE,
    packages: 'external',
    sourcemap: true,
  });

  // `require('electron')` from a Node process returns the absolute path to the
  // platform Electron binary (this is how `npx electron .` resolves it).
  const electronBin = require('electron') as unknown as string;

  const child = spawn(electronBin, [TEMP_BUNDLE], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    env: { ...process.env },
  });

  child.on('exit', (code) => {
    removeTempBundle();
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error(`Failed to launch Electron: ${err.message}`);
    removeTempBundle();
    process.exit(1);
  });

  process.on('SIGINT', () => {
    removeTempBundle();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    removeTempBundle();
    process.exit(0);
  });
}
