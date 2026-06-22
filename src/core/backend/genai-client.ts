/**
 * GenAI client constructor.
 *
 * Builds the Gemini data-plane client for a single resolved profile. The
 * `apiKey` MUST already be resolved (by the credential store or the four-tier
 * resolver) and is passed EXPLICITLY so the SDK's own `GOOGLE_API_KEY` vs
 * `GEMINI_API_KEY` env precedence is bypassed entirely (version research §2).
 *
 * NO env fallback happens here — an empty key raises ConfigurationError, per the
 * project's no-fallback rule.
 */

import { GoogleGenAI } from '@google/genai';
import { ConfigurationError } from '../../config/config-error.js';

/**
 * Construct an explicit-key `GoogleGenAI` client.
 *
 * @param apiKey resolved per-profile Gemini API key (never empty).
 * @throws ConfigurationError when the key is missing/blank.
 */
export function makeGenAiClient(apiKey: string): GoogleGenAI {
  if (!apiKey || apiKey.trim() === '') {
    throw new ConfigurationError('GEMINI_API_KEY/GOOGLE_API_KEY', ['profile key'], 'Gemini API key is missing for the selected profile.');
  }
  // Explicit apiKey => GOOGLE_API_KEY/GEMINI_API_KEY env ordering is irrelevant.
  return new GoogleGenAI({ apiKey });
}
