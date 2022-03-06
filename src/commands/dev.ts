import { createCommand } from 'tweedle';
import { sayHello } from '../utils/say-hello';
import { build, flags } from './build';

export default createCommand({
  command: 'dev',
  flags,
  executor: async (data) => {
    sayHello('dev');
    await build({ data, watch: true });
  },
});
