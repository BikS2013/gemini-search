#!/usr/bin/env node

/**
 * gemini-nav CLI launcher.
 *
 * Resolves and runs the TypeScript CLI entry point (src/cli/index.ts) via tsx
 * for dev/source runs. This is a thin .mjs loader (NOT type-checked by tsc), so
 * it may reference src/cli/index.ts before that file exists in the source tree
 * during partial builds — the dynamic spawn keeps tsc unaffected.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectDir = join(__dirname, '..');
const entryPoint = join(projectDir, 'src', 'cli', 'index.ts');

// Run the TypeScript entry point via tsx, keeping the process alive.
const child = spawn('npx', ['tsx', entryPoint, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: projectDir,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
