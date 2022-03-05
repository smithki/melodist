import { createCommand } from '../cli/create-command';
import { Flags } from '../cli/flags';

interface FooOptions {
  [key: string]: any;
}

const flags: Flags<FooOptions> = {};

export default createCommand({
  command: 'foo',
  flags,
  examples: [],
  executor: (data) => {
    console.log('foo', data);
  },
});
