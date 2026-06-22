// Diagnostic: run stores:list AND docs:list with pageSize 20 inside a real Electron
// main process to confirm the page-size cap fix (must be between 1 and 20 inclusive).
import { app } from 'electron';
import { makeBackend } from '../src/core/backend/factory.js';

app.whenReady().then(async () => {
  try {
    const backend = makeBackend('default');
    const stores = await backend.listStores({ pageSize: 20 });
    console.log('OK stores (pageSize 20):', stores.items?.length ?? 0);
    const first = stores.items?.[0];
    if (first) {
      const docs = await backend.listDocuments(first.apiName, { pageSize: 20 });
      console.log(`OK docs (pageSize 20) for ${first.displayName ?? first.apiName}:`, docs.items?.length ?? 0);
    } else {
      console.log('No stores to test docs:list against.');
    }
  } catch (e: unknown) {
    const err = e as { constructor?: { name?: string }; code?: string; message?: string };
    console.log('ERR class:', err?.constructor?.name, '| code:', err?.code);
    console.log('ERR msg  :', err?.message);
  } finally {
    app.quit();
  }
});
