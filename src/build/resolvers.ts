import path from 'path';
import { printError } from 'flik';
import { checkFileExists } from '../utils/check-file-exists';
import { getProjectRoot } from '../utils/get-project-root';
import { BuildContext } from './types';

const entrypointCache = new Map<string, string>();

/**
 * Resolves the entrypoint file for ESBuild,
 * based on the format and target platform.
 */
export async function resolveEntry(ctx: BuildContext): Promise<string>;

export async function resolveEntry(
  ctx: BuildContext,
  options: { exts?: string[]; isOptional?: false },
): Promise<string>;

export async function resolveEntry(
  ctx: BuildContext,
  options?: { exts?: string[]; isOptional: true },
): Promise<string | undefined>;

export async function resolveEntry(
  ctx: BuildContext,
  options?: { exts?: string[]; isOptional?: boolean },
): Promise<string | undefined> {
  const { exts = ['ts', 'tsx', 'js', 'jsx'], isOptional = false } = options ?? {};
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

  if (!entrypoint && !isOptional) {
    printError(new Error('Could not resolve entrypoint.'));
    process.exit(1);
  }

  if (entrypoint) {
    entrypointCache.set(key, entrypoint);
  }

  return entrypoint || undefined;
}

/**
 * Get a formatted, destination outfile.
 */
export async function resolveOutDir(ctx: BuildContext) {
  const projectRoot = await getProjectRoot(ctx.srcdir);
  return path.join(projectRoot, ctx.outdir, ctx.format);
}
