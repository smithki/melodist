import path from 'path';
import fs from 'fs';

/**
 * Gets the current `version` from `package.json` at the repository root.
 */
export function getVersion() {
  // Remeber, we are resolving this relative to `./dist/index.js`
  const pkgJsonFilePath = path.resolve(__dirname, '..', 'package.json');
  return `v${JSON.parse(fs.readFileSync(pkgJsonFilePath).toString('utf-8')).version}`;
}
