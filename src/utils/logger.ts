import { Logger as FlikLogger } from 'flik';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import isCI from 'is-ci';
import isUnicodeSupported from 'is-unicode-supported';
import wrapAnsi from 'wrap-ansi';

export const Logger = {
  env: createLogger('env', chalk.cyan),
  bundle: createLogger('bundle', chalk.blueBright),
  typeCheck: createLogger('type-check', chalk.magenta),
  formatGroup: formatLogGroup,
};

export function sayHello(cmd: string) {
  console.log(chalk`🎹 ${getLogSymbols().arrow} {cyan.italic ${cmd}}`);
  FlikLogger.visualSeparator();
}

function getLogSymbols() {
  return isUnicodeSupported()
    ? {
        info: 'ℹ',
        wait: '◌',
        complete: '◉',
        success: '✔',
        warning: '⚠',
        error: '✖',
        arrow: '➜',
      }
    : {
        info: 'i',
        wait: '□',
        complete: '■',
        success: '√',
        warning: '‼',
        error: '×',
        arrow: '->',
      };
}

function createLogger(label: string, withLabelColor: chalk.Chalk) {
  const logSymbols = getLogSymbols();
  const colorfulLabel = withLabelColor(label);
  const colorfulArrow = chalk.dim(logSymbols.arrow);

  return {
    info: (message: string) => {
      console.log(formatLog(chalk`{cyan ${logSymbols.info}}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    wait: (message: string) => {
      console.log(formatLog(chalk`${withLabelColor(logSymbols.wait)}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    complete: (message: string) => {
      console.log(formatLog(chalk`${withLabelColor(logSymbols.complete)}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    warn: (message: string) => {
      console.warn(formatLog(chalk`{yellow ${logSymbols.warning}}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    success: (message: string) => {
      console.log(formatLog(chalk`{green ${logSymbols.success}}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    error: (message: string) => {
      console.error(formatLog(chalk`{red ${logSymbols.error}}  ${colorfulLabel} ${colorfulArrow}`, message));
    },
  };
}

function formatLog(label: string, message: string) {
  if (isCI || !process.stdout.isTTY) {
    return `${label} ${message}`;
  }

  const labelLength = stripAnsi(label).length + 1;
  const wrappedMessage = wrapAnsi(message, process.stdout.columns - labelLength);
  const [firstLine, ...rest] = wrappedMessage.split('\n');
  return [`${label} ${firstLine}`, ...rest.map((line) => `${' '.repeat(labelLength)}${line}`)].join('\n');
}

function formatLogGroup(label: string, message: string) {
  if (isCI || !process.stdout.isTTY) {
    const prefixedLines = message.split('\n').map((line) => `│ ${line.trim()}`);
    return [`╭─ ${label}`, ...prefixedLines, '╰─'].join('\n').trim();
  }

  const wrappedLines = message
    .split('\n')
    .flatMap((line) => wrapAnsi(line, process.stdout.columns - 2, { trim: false }).split('\n'))
    .map((line) => `│ ${line.trim()}`);
  return [`╭─ ${label}`, ...wrappedLines, '╰─'].join('\n').trim();
}
