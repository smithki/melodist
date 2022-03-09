import chalk from 'chalk';
import Table from 'cli-table3';
import stripAnsi from 'strip-ansi';
import { logSymbols } from './log-symbols';

function createLogger(label: string) {
  return {
    info: (message: string) =>
      console.log(createRow(chalk`${logSymbols.info}  ${label} {dim ${logSymbols.arrow}}`, message)),
    warn: (message: string) =>
      console.warn(createRow(chalk`${logSymbols.warning}  ${label} {dim ${logSymbols.arrow}}`, message)),
    success: (message: string) =>
      console.log(createRow(chalk`${logSymbols.success}  ${label} {dim ${logSymbols.arrow}}`, message)),
    error: (message: string) =>
      console.error(createRow(chalk`${logSymbols.error}  ${label} {dim ${logSymbols.arrow}}`, message)),
  };
}

function createRow(label: string, message: string) {
  const labelLength = stripAnsi(label).length + 1;

  const table = new Table({
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: '',
    },
    style: {
      'padding-left': 0,
      'padding-right': 1,
    },
    colWidths: [labelLength, process.stdout.columns - labelLength],
    wordWrap: true,
  });

  table.push([label, message]);
  return table.toString();
}

export const Logger = {
  env: createLogger(chalk`{cyan env}`),
  bundle: createLogger(chalk`{blueBright bundle}`),
  typeCheck: createLogger(chalk`{magenta type-check}`),
};
