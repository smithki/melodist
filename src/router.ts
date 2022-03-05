/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */

import chalk from 'chalk';
import fs from 'fs';
import { createError, printError } from './utils/errors-warnings';
import { getVersion } from './utils/get-version';
import { resolveToDist } from './utils/path-helpers';

async function getKnownCommands() {
  const commands = await fs.promises.readdir(resolveToDist('./commands'));
  return commands.map((c) => c.replace('.js', ''));
}

(async () => {
  const [cmd, input] = process.argv.slice(2);
  const knownCommands = await getKnownCommands();
  const knownCommandsStyled = knownCommands.map((c) => chalk`{cyan ${c}}`).join(', ');

  // Anticipate that users may have given a flag as the first argument.
  if (!cmd || cmd.startsWith('-')) {
    // Handle version checks gracefully, even if command argument is missing.
    if (
      process.argv.includes('-v') ||
      process.argv.includes('--v') ||
      process.argv.includes('-version') ||
      process.argv.includes('--version')
    ) {
      console.log(getVersion());
      process.exit(0);
    }

    // Handle case where command argument is missing.
    throw createError({
      code: 'MISSING_COMMAND',
      message: `Please specify a command.\nAvailable commands: ${knownCommandsStyled}`,
    });
  }

  // Handle case where unknown command is given.
  if (!knownCommands.includes(cmd)) {
    throw createError({
      code: 'UNKNOWN_COMMAND',
      message: chalk`Command not found: {red ${cmd}}\nAvailable commands: ${knownCommandsStyled}`,
    });
  }

  await require(resolveToDist(`./commands/${cmd}.js`)).default(input ?? '');
})().catch((err) => {
  printError(err);
  process.exit(1);
});
