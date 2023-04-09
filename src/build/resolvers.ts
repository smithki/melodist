import { shutdown } from 'flik';
import path from 'path';
import { checkFileExists } from '../utils/check-file-exists';
import { getProjectRoot } from '../utils/get-project-root';
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
