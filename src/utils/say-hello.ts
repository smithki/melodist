import chalk from 'chalk';
import { printVisualSeparator } from 'tweedle';

export function sayHello(cmd: string) {
  console.log(chalk`🎹 ➜ {rgb(0,255,255).italic ${cmd}}`);
  printVisualSeparator();
}
