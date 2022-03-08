import path from 'path';
import { printError } from 'tweedle';
import { checkFileExists } from '../utils/check-file-exists';
import { getPackageJson } from '../utils/get-package-json';
import { getProjectRoot } from '../utils/get-project-root';
import { BuildContext } from './types';

const entrypointCache = new Map<string, string>();

/**
 * Resolves the entrypoint file for ESBuild,
 * based on the format and target platform.
 */

export async function resolveEntrypoint(ctx: BuildContext, options?: { exts?: string[] }): Promise<string> {
  const { exts = ['ts', 'tsx'] } = options ?? {};
  const key = `${ctx.format}:${exts.join(',')}`;

  if (entrypointCache.has(key)) {
    return entrypointCache.get(key)!;
  }

  const checkExists = async (filepath: string) => {
    return (await checkFileExists(filepath)) && filepath;
  };

  const checks = await Promise.all([
    // Check if `index.{format}.{ext}` exists...
    ...exts.map(async (ext) => checkExists(`${ctx.srcdir}/index.${ctx.format}.${ext}`)),

    // Then fallback to `index.{ext}` if it doesn't...
    ...exts.map(async (ext) => checkExists(`${ctx.srcdir}/index.${ext}`)),
  ]);

  const entrypoint = checks.find(Boolean);

  if (!entrypoint) {
    printError(new Error('Could not resolve entrypoint.'));
    process.exit(1);
  }

  entrypointCache.set(key, entrypoint);
  return entrypoint;
}

/**
 * Get a formatted, destination outfile.
 */
export async function resolveOutfile(ctx: BuildContext) {
  const projectRoot = await getProjectRoot(ctx.srcdir);
  const ext = (await getPackageJson(projectRoot)).type === 'module' ? 'cjs' : 'js';
  return path.join(projectRoot, ctx.outdir, ctx.format, `index.${ext}`);
}
