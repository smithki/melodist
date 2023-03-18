import { start } from 'flik';
import { getVersion } from './utils/get-version';

// Commands
import buildCommand from './commands/build';
import devCommand from './commands/dev';

start({
  binaryName: 'melodist',
  version: getVersion(),
  commands: [buildCommand, devCommand],
});
