import { Logger as FlikLogger } from 'flik';
import chalk from 'chalk';
import Table from 'cli-table3';
import stripAnsi from 'strip-ansi';
import isCI from 'is-ci';
import isUnicodeSupported from 'is-unicode-supported';

export const Logger = {
  env: createLogger('env', chalk.cyan),
  bundle: createLogger('bundle', chalk.blueBright),
  typeCheck: createLogger('type-check', chalk.magenta),
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
      console.log(createRow(chalk`{cyan ${logSymbols.info}}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    wait: (message: string) => {
      console.log(createRow(chalk`${withLabelColor(logSymbols.wait)}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    complete: (message: string) => {
      console.log(createRow(chalk`${withLabelColor(logSymbols.complete)}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    warn: (message: string) => {
      console.warn(createRow(chalk`{yellow ${logSymbols.warning}}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    success: (message: string) => {
      console.log(createRow(chalk`{green ${logSymbols.success}}  ${colorfulLabel} ${colorfulArrow}`, message));
    },

    error: (message: string) => {
      console.error(createRow(chalk`{red ${logSymbols.error}}  ${colorfulLabel} ${colorfulArrow}`, message));
    },
  };
}

function createRow(label: string, message: string) {
  if (isCI || !process.stdout.isTTY) return `${label} ${message}`;
  const labelLength = stripAnsi(label).length + 1;

  const table = new Table({
    // eslint-disable-next-line prettier/prettier
    chars: { top: "", "top-mid": "", "top-left": "", "top-right": "", bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "", left: "", "left-mid": "", mid: "", "mid-mid": "", right: "", "right-mid": "", middle: "" },
    style: { 'padding-left': 0, 'padding-right': 1 },
    colWidths: [labelLength, process.stdout.columns - labelLength],
    wordWrap: true,
  });

  table.push([label, message]);
  return table.toString().trim();
}
