import { serve } from '@hono/node-server';
import { app } from './app.js';
import { config } from './config.js';
import { ensureDbReady } from './app.js';

// Warm schema before accepting traffic in long-running Node mode
void ensureDbReady()
  .then(() => {
    serve({ fetch: app.fetch, port: config.port }, info => {
      console.log(`ProofRoom API http://localhost:${info.port} (${config.nodeEnv})`);
      console.log(
        `LLM: ${config.llmApiKey ? `${config.llmProvider}/${config.llmModel}` : 'local-retrieval fallback (set MISTRAL_API_KEY)'}`
      );
      console.log(
        `Seed demo: ${config.seedDemo} · login limit ${config.rateLimitLogin.limit}/${config.rateLimitLogin.windowMs}ms`
      );
    });
  })
  .catch(err => {
    console.error('Failed to start API (DB/schema):', err);
    process.exit(1);
  });
