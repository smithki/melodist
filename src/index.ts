import { initiate, printError } from 'tweedle';
import { getVersion } from './utils/getVersion';

// Commands
import buildCommand from './commands/build';
import devCommand from './commands/dev';

initiate({
  binaryName: 'melodist',
  version: getVersion(),
  commands: [buildCommand, devCommand],
})
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    printError(err);
    process.exit(1);
  });
