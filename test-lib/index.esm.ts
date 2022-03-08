import { Foo } from './foo';

console.log('esm', process.env.TEST);

export function bar(xyz: Foo) {}

export { Buzz } from './biz/buzz';
