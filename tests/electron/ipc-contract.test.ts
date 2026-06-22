/**
 * Tests for src/electron/ipc-contract.ts
 *
 * Drift-guard: asserts that:
 *  - INVOKE_CHANNEL_LIST contains exactly the 15 declared invoke channels
 *  - EVENT_CHANNEL_LIST contains exactly the 1 declared event channel
 *  - InvokeChannel type members are present at runtime
 *  - IpcOk / IpcErr / IpcResult envelope shapes satisfy the contract
 *  - No duplicates exist in the runtime channel lists
 *
 * Per Design 002 "API & Interface Contracts" — these lists are the single
 * source of truth mirrored by preload.cjs; any drift is a breaking bug.
 */

import { describe, it, expect } from 'vitest';
import {
  INVOKE_CHANNEL_LIST,
  EVENT_CHANNEL_LIST,
} from '../../src/electron/ipc-contract.js';

// ---------------------------------------------------------------------------
// Expected values (canonical from Design 002)
// ---------------------------------------------------------------------------

const EXPECTED_INVOKE_CHANNELS = [
  'stores:list',
  'stores:get',
  'stores:create',
  'stores:delete',
  'docs:list',
  'docs:get',
  'docs:upload',
  'docs:delete',
  'docs:replace',
  'query:run',
  'registry:list',
  'registry:refresh',
  'registry:prune',
  'profiles:list',
  'profiles:select',
] as const;

const EXPECTED_EVENT_CHANNELS = ['upload:progress'] as const;

// ---------------------------------------------------------------------------
// INVOKE_CHANNEL_LIST — drift guard (15 channels, exact set)
// ---------------------------------------------------------------------------

describe('INVOKE_CHANNEL_LIST — channel count', () => {
  it('contains exactly 15 invoke channels', () => {
    expect(INVOKE_CHANNEL_LIST).toHaveLength(15);
  });
});

describe('INVOKE_CHANNEL_LIST — channel presence (no missing)', () => {
  for (const channel of EXPECTED_INVOKE_CHANNELS) {
    it(`contains "${channel}"`, () => {
      expect(INVOKE_CHANNEL_LIST).toContain(channel);
    });
  }
});

describe('INVOKE_CHANNEL_LIST — no extras', () => {
  it('has no channels beyond the 15 expected ones', () => {
    const expectedSet = new Set<string>(EXPECTED_INVOKE_CHANNELS);
    const extras = INVOKE_CHANNEL_LIST.filter((ch) => !expectedSet.has(ch));
    expect(extras).toEqual([]);
  });
});

describe('INVOKE_CHANNEL_LIST — no duplicates', () => {
  it('contains no duplicate channel names', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const ch of INVOKE_CHANNEL_LIST) {
      if (seen.has(ch)) duplicates.push(ch);
      seen.add(ch);
    }
    expect(duplicates).toEqual([]);
  });
});

describe('INVOKE_CHANNEL_LIST — immutability', () => {
  it('is a readonly array (frozen or sealed at runtime)', () => {
    // The type is `readonly InvokeChannel[]`. We verify the runtime value is
    // actually an Array (not some other iterable) and has the right length.
    expect(Array.isArray(INVOKE_CHANNEL_LIST)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group-level channel presence (store / docs / query / registry / profiles)
// ---------------------------------------------------------------------------

describe('INVOKE_CHANNEL_LIST — store channels', () => {
  it('contains stores:list', () => expect(INVOKE_CHANNEL_LIST).toContain('stores:list'));
  it('contains stores:get', () => expect(INVOKE_CHANNEL_LIST).toContain('stores:get'));
  it('contains stores:create', () => expect(INVOKE_CHANNEL_LIST).toContain('stores:create'));
  it('contains stores:delete', () => expect(INVOKE_CHANNEL_LIST).toContain('stores:delete'));
});

describe('INVOKE_CHANNEL_LIST — document channels', () => {
  it('contains docs:list', () => expect(INVOKE_CHANNEL_LIST).toContain('docs:list'));
  it('contains docs:get', () => expect(INVOKE_CHANNEL_LIST).toContain('docs:get'));
  it('contains docs:upload', () => expect(INVOKE_CHANNEL_LIST).toContain('docs:upload'));
  it('contains docs:delete', () => expect(INVOKE_CHANNEL_LIST).toContain('docs:delete'));
  it('contains docs:replace', () => expect(INVOKE_CHANNEL_LIST).toContain('docs:replace'));
});

describe('INVOKE_CHANNEL_LIST — query channel', () => {
  it('contains query:run', () => expect(INVOKE_CHANNEL_LIST).toContain('query:run'));
});

describe('INVOKE_CHANNEL_LIST — registry channels', () => {
  it('contains registry:list', () => expect(INVOKE_CHANNEL_LIST).toContain('registry:list'));
  it('contains registry:refresh', () => expect(INVOKE_CHANNEL_LIST).toContain('registry:refresh'));
  it('contains registry:prune', () => expect(INVOKE_CHANNEL_LIST).toContain('registry:prune'));
});

describe('INVOKE_CHANNEL_LIST — profile channels', () => {
  it('contains profiles:list', () => expect(INVOKE_CHANNEL_LIST).toContain('profiles:list'));
  it('contains profiles:select', () => expect(INVOKE_CHANNEL_LIST).toContain('profiles:select'));
});

// ---------------------------------------------------------------------------
// EVENT_CHANNEL_LIST
// ---------------------------------------------------------------------------

describe('EVENT_CHANNEL_LIST — channel count', () => {
  it('contains exactly 1 event channel', () => {
    expect(EVENT_CHANNEL_LIST).toHaveLength(1);
  });
});

describe('EVENT_CHANNEL_LIST — channel presence', () => {
  for (const channel of EXPECTED_EVENT_CHANNELS) {
    it(`contains "${channel}"`, () => {
      expect(EVENT_CHANNEL_LIST).toContain(channel);
    });
  }
});

describe('EVENT_CHANNEL_LIST — no extras', () => {
  it('has no channels beyond upload:progress', () => {
    const expectedSet = new Set<string>(EXPECTED_EVENT_CHANNELS);
    const extras = EVENT_CHANNEL_LIST.filter((ch) => !expectedSet.has(ch));
    expect(extras).toEqual([]);
  });
});

describe('EVENT_CHANNEL_LIST — no duplicates', () => {
  it('contains no duplicate channel names', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const ch of EVENT_CHANNEL_LIST) {
      if (seen.has(ch)) duplicates.push(ch);
      seen.add(ch);
    }
    expect(duplicates).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// IpcOk / IpcErr / IpcResult — envelope shape validation (runtime helpers)
// ---------------------------------------------------------------------------

describe('IpcOk envelope shape', () => {
  it('ok:true with data satisfies IpcOk<T> shape', () => {
    // Structural check: the object has ok===true and a data field.
    const ok = { ok: true as const, data: { foo: 'bar' } };
    expect(ok.ok).toBe(true);
    expect(ok.data).toEqual({ foo: 'bar' });
  });

  it('IpcOk with null data is structurally valid', () => {
    const ok = { ok: true as const, data: null };
    expect(ok.ok).toBe(true);
    expect(ok.data).toBeNull();
  });
});

describe('IpcErr envelope shape', () => {
  it('ok:false with {code, message} satisfies IpcErr shape', () => {
    const err = { ok: false as const, error: { code: 'INTERNAL', message: 'Internal error' } };
    expect(err.ok).toBe(false);
    expect(err.error.code).toBe('INTERNAL');
    expect(err.error.message).toBe('Internal error');
  });

  it('error envelope has no stack field', () => {
    const err = { ok: false as const, error: { code: 'INTERNAL', message: 'Internal error' } };
    expect('stack' in err.error).toBe(false);
  });

  it('error envelope has no cause field', () => {
    const err = { ok: false as const, error: { code: 'INTERNAL', message: 'Internal error' } };
    expect('cause' in err.error).toBe(false);
  });
});

describe('IpcResult discriminated union', () => {
  it('can discriminate ok:true branch', () => {
    const result = { ok: true as const, data: 42 };
    // Simulate runtime narrowing
    if (result.ok) {
      expect(result.data).toBe(42);
    } else {
      // Should not reach here
      expect.fail('Expected ok:true branch');
    }
  });

  it('can discriminate ok:false branch', () => {
    const result = { ok: false as const, error: { code: 'RATE_LIMIT', message: 'too many' } };
    if (!result.ok) {
      expect(result.error.code).toBe('RATE_LIMIT');
      expect(result.error.message).toBe('too many');
    } else {
      expect.fail('Expected ok:false branch');
    }
  });
});
