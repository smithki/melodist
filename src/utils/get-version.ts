import fs from 'fs';
import { resolveToRoot } from './path-helpers';

export function getVersion() {
  return `v${JSON.parse(fs.readFileSync(resolveToRoot('package.json')).toString('utf8')).version}`;
}
