import { config } from '../config.js';
import { pool } from './pool.js';
import { ensureSchema } from './ensure-schema.js';

async function main() {
  // Touch config so assert paths load env
  void config.nodeEnv;
  await ensureSchema();
  console.log('Migration complete.');
  await pool.end();
}

main().catch(async err => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
