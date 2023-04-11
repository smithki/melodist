import { shutdown } from 'flik';
import path from 'path';
import findUp from 'find-up';
import fs from 'fs';
import { checkFileExists } from '../utils/check-file-exists';
import { Logger } from '../utils/logger';
import { MelodistContext } from './types';

const entryPointCache = new Map<string, string>();

/**
 * Resolves the entrypoint file for ESBuild,
 * based on the format and target platform.
 */
export async function resolveEntryPoint(
  ctx: MelodistContext,
  options?: { exts?: string[]; isOptional?: boolean },
): Promise<string | undefined> {
  const { exts = [], isOptional = false } = options ?? {};
  const key = `${ctx.format}:${exts.join(',')}`;

  if (entryPointCache.has(key)) {
    return entryPointCache.get(key)!;
  }

  const checkExists = async (filepath: string) => {
    return (await checkFileExists(filepath)) && filepath;
  };

  const checks = await Promise.all([
    // `{srcdir}/index.{format}.{ext}`
    ...exts.map(async (ext) => checkExists(`${ctx.srcdir}/index.${ctx.format}.${ext}`)),

    // `{srcdir}/index.{ext}`
    ...exts.map(async (ext) => checkExists(`${ctx.srcdir}/index.${ext}`)),

    // `index.{format}.{ext}`
    ...exts.map(async (ext) => checkExists(`index.${ctx.format}.${ext}`)),

    // `index.{ext}`
    ...exts.map(async (ext) => checkExists(`index.${ext}`)),
  ]);

  const resolvedEntryPoint = checks.find(Boolean);

  if (!resolvedEntryPoint && !isOptional) {
    Logger.bundle.error('Could not resolve entry-point.');
    await shutdown(1);
  }

  if (resolvedEntryPoint) {
    entryPointCache.set(key, resolvedEntryPoint);
  }

  return resolvedEntryPoint || undefined;
}

/**
 * Get a formatted, destination outfile.
 */
export async function resolveOutDir(ctx: MelodistContext) {
  const projectRoot = await getProjectRoot(ctx.srcdir);
  return path.join(projectRoot, ctx.outdir, ctx.format);
}

/**
 * Find the root of the project (i.e.: where is the
 * nearest `package.json` file?) relative to `cwd`.
 */
export async function getProjectRoot(cwd: string = process.cwd()) {
  if (getProjectRoot.cache.has(cwd)) return getProjectRoot.cache.get(cwd)!;

  let result: string = process.cwd();

  try {
    const pkgJson = await findUp('package.json', { cwd });
    if (pkgJson) {
      result = path.dirname(pkgJson);
    }
  } catch (err) {
    getProjectRoot.cache.delete(cwd);
    throw err;
  }

  getProjectRoot.cache.set(cwd, result);
  return result;
}
getProjectRoot.cache = new Map<string, string>();

/**
 * Parse the `package.json` file for the
 * consumer package (relative to `cwd`).
 */
export async function getPackageJson(cwd: string = process.cwd()) {
  if (getPackageJson.cache.has(cwd)) return getPackageJson.cache.get(cwd)!;

  let result: Record<string, any> = {};

  try {
    const projectRoot = await getProjectRoot(cwd);
    const pkgJsonPath = path.resolve(projectRoot, 'package.json');
    if (await checkFileExists(pkgJsonPath)) {
      result = JSON.parse((await fs.promises.readFile(pkgJsonPath)).toString('utf-8'));
    }
  } catch (err) {
    getPackageJson.cache.delete(cwd);
    throw err;
  }

  getPackageJson.cache.set(cwd, result);
  return result;
}
getPackageJson.cache = new Map<string, Record<string, any>>();
