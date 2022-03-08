import findUp from 'find-up';
import path from 'path';

const cache = new Map<string, string>();

export async function getProjectRoot(cwd: string = process.cwd()) {
  if (cache.has(cwd)) return cache.get(cwd)!;

  let result: string = process.cwd();

  try {
    const pkgJson = await findUp('package.json', { cwd });
    if (pkgJson) result = path.dirname(pkgJson);
  } catch (err) {
    cache.delete(cwd);
    throw err;
  } finally {
    cache.set(cwd, result);
  }

  return result;
}
