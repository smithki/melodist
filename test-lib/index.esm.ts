import { Foo } from './foo';
import './spam.css';
import styles from './monty.module.css';

console.log('esm', styles, process.env.TEST);

export function bar(xyz: Foo) {}

// bar(''); // Uncomment to force type error

export { Buzz } from './biz/buzz';
