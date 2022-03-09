import chalk from 'chalk';
import isUnicodeSupported from 'is-unicode-supported';

export const logSymbols = isUnicodeSupported()
  ? {
      info: chalk.cyan('ℹ'),
      success: chalk.green('✔'),
      warning: chalk.yellow('⚠'),
      error: chalk.red('✖'),
      arrow: '➜',
    }
  : {
      info: chalk.cyan('i'),
      success: chalk.green('√'),
      warning: chalk.yellow('‼'),
      error: chalk.red('×'),
      arrow: '->',
    };
