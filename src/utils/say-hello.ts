import chalk from 'chalk';

export function sayHello(cmd: string) {
  console.log(chalk`🎹 ➜ {rgb(0,255,255).italic ${cmd}}\n`);
}
