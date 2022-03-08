import path from 'path';
import fs from 'fs';
import { checkFileExists } from './check-file-exists';
import { getProjectRoot } from './get-project-root';

const cache = new Map<string, Record<string, any>>();

/**
 * Parse the `package.json` file for the consumer
 * package (relative to `cwd`).
 */
export async function getPackageJson(cwd: string): Promise<Record<string, any>> {
  if (cache.has(cwd)) return cache.get(cwd)!;

  let result: Record<string, any> = {};

  try {
    const projectRoot = await getProjectRoot(cwd);
    const pkgJsonPath = path.resolve(projectRoot, 'package.json');
    if (await checkFileExists(pkgJsonPath)) {
      result = JSON.parse((await fs.promises.readFile(pkgJsonPath)).toString('utf-8'));
    }
  } catch (err) {
    cache.delete(cwd);
    throw err;
  } finally {
    cache.set(cwd, result);
  }

  return result;
}
