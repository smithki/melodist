import { Plugin } from 'esbuild';
import { BuildContext } from '../types';

/**
 * Creates a list of plugins to replace
 * externalized packages with a global variable.
 */
export function globalsPlugins(ctx: BuildContext): Plugin[] {
  const globals: Record<string, string> = Object.fromEntries(ctx.global.map((g) => g.split('='))) || {};

  return Object.entries(globals).map(([packageName, globalVar]) => {
    const namespace = `melodist:globals-plugin:${packageName}`;
    return {
      name: namespace,
      setup: (build) => {
        build.onResolve({ filter: new RegExp(`^${packageName}$`) }, (args) => {
          return {
            path: args.path,
            namespace,
          };
        });

        build.onLoad({ filter: /.*/, namespace }, () => {
          const contents = `module.exports = ${globalVar}`;
          return { contents };
        });
      },
    };
  });
}
