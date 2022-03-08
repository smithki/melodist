import path from 'path';
import { checkFileExists } from '../utils/check-file-exists';
import { getPackageJson } from '../utils/get-package-json';
import { getProjectRoot } from '../utils/get-project-root';
import { BuildContext } from './types';

/**
 * Resolves the entrypoint file for ESBuild,
 * based on the format and target platform.
 */
export async function resolveEntrypoint(ctx: BuildContext) {
  const findEntrypoint = async (indexTarget?: string) => {
    if (ctx.format && (await checkFileExists(`${ctx.srcdir}/index.${indexTarget}.ts`))) {
      return `${ctx.srcdir}/index.${indexTarget}.ts`;
    }
    return `${ctx.srcdir}/index.ts`;
  };

  return findEntrypoint(ctx.format);
}

/**
 * Get a formatted, destination outfile.
 */
export async function resolveOutfile(ctx: BuildContext) {
  const projectRoot = await getProjectRoot(ctx.srcdir);
  const ext = (await getPackageJson(projectRoot)).type === 'module' ? 'cjs' : 'js';
  return path.join(projectRoot, ctx.outdir, ctx.format, `index.${ext}`);
}
