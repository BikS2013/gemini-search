import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import type { ApiConfig } from '../config.js';

/**
 * Serves the OpenAPI spec (and optional swagger-ui) BEFORE auth. The spec is
 * read from `API/openapi.yaml`. Routes:
 *   GET /openapi       -> the raw YAML
 *   GET /openapi.yaml  -> the raw YAML (alias)
 *   GET /docs          -> swagger-ui (when enabled)
 */
export function openapiRouter(config: ApiConfig): Router {
  const r = Router();
  const here = dirname(fileURLToPath(import.meta.url));
  // Compiled layout: dist/src/routes/ -> ../../../openapi.yaml.
  // Dev (tsx) layout: src/routes/ -> ../../openapi.yaml.
  // Try both so the spec resolves in either mode.
  const candidates = [
    resolve(here, '../../../openapi.yaml'),
    resolve(here, '../../openapi.yaml'),
  ];
  let yamlText = '';
  for (const p of candidates) {
    try {
      yamlText = readFileSync(p, 'utf8');
      break;
    } catch {
      // try next candidate
    }
  }
  if (!yamlText) {
    throw new Error(`openapi.yaml not found; checked: ${candidates.join(', ')}`);
  }
  const parsed = YAML.parse(yamlText);

  const sendYaml = (_req: unknown, res: import('express').Response): void => {
    res.setHeader('Content-Type', 'application/yaml');
    res.send(yamlText);
  };
  r.get('/openapi', sendYaml);
  r.get('/openapi.yaml', sendYaml);

  if (config.swaggerUiEnabled) {
    r.use('/docs', swaggerUi.serve, swaggerUi.setup(parsed));
  }
  return r;
}
