#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(join(root, 'server/src/db/schema.sql'), 'utf8');
const out = `/** Auto-synced from schema.sql — run npm run schema:embed after edits */\nexport const SCHEMA_SQL = ${JSON.stringify(sql)};\n`;
writeFileSync(join(root, 'server/src/db/schema-embed.ts'), out);
console.log('schema-embed.ts updated');
