import { createCommand } from '../cli/create-command';
import { build, flags } from './build';

export default createCommand({
  command: 'dev',
  flags,
  examples: [],
  executor: async (data) => {
    await build({ data, watch: true });
  },
});
