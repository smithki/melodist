import { initiate } from 'tweedle';
import { getVersion } from './utils/getVersion';

// Commands
import buildCommand from './commands/build';
import devCommand from './commands/dev';

initiate({
  binaryName: 'melodist',
  version: getVersion(),
  commands: [buildCommand, devCommand],
});
