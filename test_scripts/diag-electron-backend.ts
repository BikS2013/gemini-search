// Diagnostic: reproduce the Electron stores:list IPC path (makeBackend -> listStores)
// and surface the REAL error class/code/message that the run() choke point would
// otherwise mask as opaque INTERNAL. Run with and without GEMINI_API_KEY/GOOGLE_API_KEY.
import { makeBackend } from '../src/core/backend/factory.js';

async function main(): Promise<void> {
  console.log('has GEMINI_API_KEY:', Boolean(process.env.GEMINI_API_KEY));
  console.log('has GOOGLE_API_KEY:', Boolean(process.env.GOOGLE_API_KEY));
  try {
    const backend = makeBackend('default');
    const page = await backend.listStores({ pageSize: 5 });
    console.log('OK — stores returned:', page.items?.length ?? 0);
  } catch (e: unknown) {
    const err = e as { constructor?: { name?: string }; code?: string; message?: string; stack?: string };
    console.log('ERROR class :', err?.constructor?.name);
    console.log('ERROR code  :', err?.code);
    console.log('ERROR msg   :', err?.message);
    console.log('STACK head  :\n' + String(err?.stack ?? '').split('\n').slice(0, 5).join('\n'));
  }
}

void main();
