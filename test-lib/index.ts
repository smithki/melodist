import { Foo } from './foo';

console.log('hello world', process.env.TEST);

export function bar(xyz: Foo) {}

// bar(''); // Uncomment to force type error

export { Buzz } from './biz/buzz';
