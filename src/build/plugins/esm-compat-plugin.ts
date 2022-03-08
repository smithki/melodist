import { Plugin } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { resolveOutfile } from '../resolvers';
import { BuildContext } from '../types';

async function copyESMBundle(ctx: BuildContext) {
  if (ctx.format === 'esm') {
    const outfile = await resolveOutfile(ctx);
    if (outfile.endsWith('mjs')) {
      await fs.promises.copyFile(outfile, path.join(path.dirname(outfile), 'index.js'));
    } else {
      await fs.promises.copyFile(outfile, path.join(path.dirname(outfile), 'index.mjs'));
    }
  }
}

/**
 * If the ESM output extension is `.js`, copies ESM output to `.mjs`.
 * If the ESM output extension is `.mjs`, copies ESM output to `.js`.
 */
export function esmCompatPlugin(ctx: BuildContext): Plugin {
  const namespace = `melodist.esm-compat`;

  return {
    name: namespace,
    setup: (build) => {
      build.onEnd(async () => {
        await copyESMBundle(ctx);
      });
    },
  };
}
