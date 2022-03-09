import chalk from 'chalk';
import { printVisualSeparator } from 'tweedle';
import { logSymbols } from './log-symbols';

export function sayHello(cmd: string) {
  console.log(chalk`🎹 ${logSymbols.arrow} {cyan.italic ${cmd}}`);
  printVisualSeparator();
}
