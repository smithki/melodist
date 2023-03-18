import esbuild, { build, BuildOptions } from 'esbuild';
import { resolveEntry, resolveOutDir } from './resolvers';
import { getDefaultExternals } from './externals';
import { DisposeFunction, MelodistContext } from './types';
import { defineEnv } from './env';
import { createTypeChecker } from './type-checker';

// Plugins
import { cssPlugin } from './plugins/css';
import { esmCompatPlugin } from './plugins/esm-compat';
import { globImport } from './plugins/glob-import';
import { globalsPlugins } from './plugins/globals';
import { statsPlugin } from './plugins/stats';

/**
 * Bundle with ESBuild.
 */
export async function bundle(ctx: MelodistContext): Promise<DisposeFunction> {
  await createTypeChecker(ctx);

  const buildContext = await esbuild.context<BuildOptions>({
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
    entryPoints: [
      await resolveEntry(ctx),
      ctx.css && (await resolveEntry(ctx, { exts: ['css'], isOptional: true })),
    ].filter(Boolean) as string[],
    define: defineEnv(ctx.define),
    metafile: true,
    plugins: [...globalsPlugins(ctx), esmCompatPlugin(ctx), cssPlugin(ctx), statsPlugin(ctx), globImport()].filter(
      Boolean,
    ),
  });

  if (ctx.watch) {
    await buildContext.watch();
  } else {
    await buildContext.rebuild();
  }

  return buildContext.dispose;
}
