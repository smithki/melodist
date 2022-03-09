import esbuild from 'esbuild';
import chalk from 'chalk';
import { resolveEntry, resolveOutDir } from './resolvers';
import { getDefaultExternals } from './externals';
import { BuildContext } from './types';

// Plugins
import { globalsPlugins } from './plugins/globals-plugin';
import { cssModulesPlugin } from './plugins/css-modules-plugin';
import { statsPlugin } from './plugins/stats-plugin';
import { esmCompatPlugin } from './plugins/esm-compat-plugin';
import { createTypeChecker } from './type-checker';

/**
 * Bundle with ESBuild.
 */
export async function bundle(ctx: BuildContext) {
  await createTypeChecker(ctx);

  await esbuild.build({
    outdir: await resolveOutDir(ctx),
    entryNames: '[dir]/index',
    platform: ctx.platform,
    format: ctx.format,
    sourcemap: ctx.sourcemap,
    external: ctx.external ?? (await getDefaultExternals(ctx.srcdir)),
    bundle: true,
    logLevel: 'silent',
    target: ctx.esTarget,
    minify: !ctx.watch && ctx.minify,
    globalName: ctx.name,
    entryPoints: [await resolveEntry(ctx), await resolveEntry(ctx, { exts: ['css'], isOptional: true })].filter(
      Boolean,
    ) as string[],
    define: Object.fromEntries(
      Object.entries(ctx.define).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
    ),
    watch: !!ctx.watch,
    metafile: true,

    plugins: [...globalsPlugins(ctx), esmCompatPlugin(ctx), cssModulesPlugin(ctx), statsPlugin(ctx)].filter(Boolean),
  });
}
