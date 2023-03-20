import { createCommand } from 'flik';
import { sayHello } from '../utils/logger';
import { build, flags, positionalArgs } from './build';

export default createCommand(
  {
    command: 'dev',
    description: 'Development command',
    inputs: { flags, positionalArgs },
  },

  async ({ data, addShutdownTask, keepAlive }) => {
    sayHello('dev');
    const cleanups = await build({ data, watch: true });
    addShutdownTask(async () => {
      await Promise.all(cleanups);
    });
    return keepAlive;
  },
);
