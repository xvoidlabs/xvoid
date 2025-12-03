import { NodeAgent } from './agent';
import { logger } from './logger';

const agent = new NodeAgent();

agent
  .start()
  .catch((error) => {
    logger.error({ err: error }, 'Failed to start node agent');
    process.exit(1);
  });

const handleShutdown = async () => {
  logger.info('Received shutdown signal');
  await agent.shutdown();
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

