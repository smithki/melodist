import { createCommand } from 'flik';
import { sayHello } from '../utils/logger';
import { build, flags, positionalArgs } from './build';

export default createCommand(
  {
    command: 'dev',
    description: 'Development command',
    flags,
    positionalArgs,
  },

  async ({ data }) => {
    sayHello('dev');
    await build({ data, watch: true });
  },
);
