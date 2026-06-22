/**
 * Dev entry for the Electron desktop surface.
 *
 * Run via `npm run dev:electron` (`tsx src/electron/dev.ts`). Bundles the main
 * process and spawns Electron against the source-tree resources under
 * `src/electron/` and the same `~/.tool-agents/gemini-nav/` config the CLI uses.
 */

import { launchElectronApp } from './launch.js';

void launchElectronApp();
