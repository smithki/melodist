import { createCommand } from 'tweedle';
import { sayHello } from '../utils/say-hello';
import { build, flags, positionalArgs } from './build';

export default createCommand(
  {
    command: 'dev',
    flags,
    positionalArgs,
  },

  async (data) => {
    sayHello('dev');
    await build({ data, watch: true });
  },
);
