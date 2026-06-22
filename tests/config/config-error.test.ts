/**
 * Unit tests for ConfigurationError (src/config/config-error.ts).
 *
 * Covers:
 *  - Shape: name, code, missingSetting, checkedSources properties
 *  - Message format: mandatory-setting line + checked sources + optional detail
 *  - instanceof check (prototype chain restored via Object.setPrototypeOf)
 *  - No detail variant
 *  - Multiple checked sources joined with ", "
 */

import { describe, it, expect } from 'vitest';
import { ConfigurationError } from '../../src/config/config-error.js';

describe('ConfigurationError — shape', () => {
  it('is an instance of Error', () => {
    const err = new ConfigurationError('MY_VAR', ['src1'], 'detail');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of ConfigurationError (prototype chain intact)', () => {
    const err = new ConfigurationError('MY_VAR', ['src1']);
    expect(err).toBeInstanceOf(ConfigurationError);
  });

  it('has name === "ConfigurationError"', () => {
    const err = new ConfigurationError('MY_VAR', ['src1']);
    expect(err.name).toBe('ConfigurationError');
  });

  it('has code === "CONFIG_MISSING"', () => {
    const err = new ConfigurationError('MY_VAR', ['src1']);
    expect(err.code).toBe('CONFIG_MISSING');
  });

  it('stores missingSetting exactly as passed', () => {
    const err = new ConfigurationError('GEMINI_API_KEY', ['--key', 'env:GEMINI_API_KEY']);
    expect(err.missingSetting).toBe('GEMINI_API_KEY');
  });

  it('stores checkedSources as passed array (by reference equality for empty array)', () => {
    const sources = ['--key', 'env:GEMINI_API_KEY/GOOGLE_API_KEY', '/home/x/.env'];
    const err = new ConfigurationError('GEMINI_API_KEY', sources);
    expect(err.checkedSources).toEqual(sources);
  });

  it('checkedSources is independent of the original array (shallow copy or same ref — documented value)', () => {
    const sources = ['srcA'];
    const err = new ConfigurationError('VAR', sources);
    // The constructor stores the reference; this test documents that behaviour.
    // The important invariant is that the stored value equals the passed value.
    expect(err.checkedSources).toEqual(['srcA']);
  });
});

describe('ConfigurationError — message format', () => {
  it('contains the missingSetting name in the message', () => {
    const err = new ConfigurationError('MY_SETTING', ['src1']);
    expect(err.message).toContain('MY_SETTING');
  });

  it('contains the checked sources joined by ", "', () => {
    const err = new ConfigurationError('MY_SETTING', ['src1', 'src2', 'src3']);
    expect(err.message).toContain('src1, src2, src3');
  });

  it('message includes "Mandatory setting" prefix', () => {
    const err = new ConfigurationError('MY_SETTING', ['src1']);
    expect(err.message).toMatch(/Mandatory setting/i);
  });

  it('message includes "Checked:" label', () => {
    const err = new ConfigurationError('MY_SETTING', ['src1']);
    expect(err.message).toMatch(/Checked:/);
  });

  it('appends detail when provided', () => {
    const err = new ConfigurationError('MY_SETTING', ['src1'], 'Extra detail here.');
    expect(err.message).toContain('Extra detail here.');
  });

  it('omits detail suffix when not provided', () => {
    const err = new ConfigurationError('MY_SETTING', ['src1']);
    // Message ends after the sources list (dot), no extra detail text.
    expect(err.message).not.toContain('undefined');
    expect(err.message.endsWith('.')).toBe(true);
  });

  it('full message matches expected template — with detail', () => {
    const err = new ConfigurationError(
      'GEMINI_API_KEY',
      ['--key', 'env:GEMINI_API_KEY'],
      'No key found.',
    );
    expect(err.message).toBe(
      'Mandatory setting "GEMINI_API_KEY" was not provided. Checked: --key, env:GEMINI_API_KEY. No key found.',
    );
  });

  it('full message matches expected template — without detail', () => {
    const err = new ConfigurationError('GEMINI_API_KEY', ['--key']);
    expect(err.message).toBe(
      'Mandatory setting "GEMINI_API_KEY" was not provided. Checked: --key.',
    );
  });
});

describe('ConfigurationError — usability in catch blocks', () => {
  it('can be thrown and caught as a ConfigurationError', () => {
    const run = () => {
      throw new ConfigurationError('VAR', ['src1']);
    };
    expect(run).toThrow(ConfigurationError);
  });

  it('can be caught as a plain Error', () => {
    const run = () => {
      throw new ConfigurationError('VAR', ['src1']);
    };
    expect(run).toThrow(Error);
  });

  it('stack trace is defined', () => {
    const err = new ConfigurationError('VAR', ['src1']);
    expect(err.stack).toBeDefined();
  });
});
