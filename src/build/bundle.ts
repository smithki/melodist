import esbuild, { Plugin } from 'esbuild';
import { resolveEntrypoint, resolveOutfile } from './resolvers';
import { getDefaultExternals } from './externals';
import { BuildContext } from './types';

// Plugins
import { globalsPlugins } from './plugins/globals-plugin';
import { cssModulesPlugin } from './plugins/css-modules-plugin';
import { typescriptPlugin } from './plugins/typescript-plugin';
import { statsPlugin } from './plugins/stats-plugin';
import { esmCompatPlugin } from './plugins/esm-compat-plugin';

/**
 * Bundle with ESBuild.
 */
export async function bundle(ctx: BuildContext) {
  const outfile = await resolveOutfile(ctx);

  await esbuild.build({
    outfile,
    platform: ctx.platform,
    format: ctx.format,
    sourcemap: ctx.sourcemap,
    external: ctx.external ?? (await getDefaultExternals(ctx.srcdir)),
    bundle: true,
    target: 'es6',
    minify: !ctx.watch,
    globalName: ctx.name,
    entryPoints: [await resolveEntrypoint(ctx)],
    define: Object.fromEntries(
      Object.entries(ctx.define).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
    ),
    watch: !!ctx.watch,

    plugins: [
      ...globalsPlugins(ctx),
      esmCompatPlugin(ctx),
      cssModulesPlugin(ctx),
      statsPlugin(ctx),
      ctx.isInitialBuildInstance && ctx.typecheck && typescriptPlugin(ctx),
    ].filter(Boolean) as Plugin[],
  });
}
