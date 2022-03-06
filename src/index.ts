import { initiate, printError } from 'tweedle';

// Commands
import buildCommand from './commands/build';
import devCommand from './commands/dev';

initiate({
  binaryName: 'melodist',
  commands: [buildCommand, devCommand],
})
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    printError(err);
    process.exit(1);
  });
