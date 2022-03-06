import { createCommand } from '../cli/create-command';
import { buildFromOptions, flags } from './build';

export default createCommand({
  command: 'dev',
  flags,
  examples: [],
  executor: async (data) => {
    await buildFromOptions({ data, watch: true });
  },
});
