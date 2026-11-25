import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './shared/database.js';

const config = loadConfig(process.env);
const database = createDatabase(config.databaseUrl);
const app = await buildApp({ config, database });

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, 'encerrando');

  const forceExit = setTimeout(() => {
    app.log.error('tempo de encerramento esgotado, saindo à força');
    process.exit(1);
  }, config.shutdownTimeoutMs);
  forceExit.unref();

  try {
    await app.close();
    await database.$disconnect();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'erro ao encerrar');
    process.exit(1);
  }
}

process.once('SIGINT', (signal) => void shutdown(signal));
process.once('SIGTERM', (signal) => void shutdown(signal));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error({ err: error }, 'falha ao iniciar');
  process.exit(1);
}
