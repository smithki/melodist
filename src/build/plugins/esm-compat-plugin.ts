import { Plugin } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { BuildContext } from '../types';

async function copyESMBundle(options: { filepath?: string }) {
  const { filepath } = options;
  if (!filepath) return;

  if (filepath.endsWith('mjs')) {
    await fs.promises.copyFile(filepath, path.join(path.dirname(filepath), 'index.js'));
  } else {
    await fs.promises.copyFile(filepath, path.join(path.dirname(filepath), 'index.mjs'));
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
      build.onEnd(async (result) => {
        if (ctx.format === 'esm') {
          const jsOutput = Object.keys(result.metafile?.outputs ?? {}).find((o) => o.endsWith('js'));
          await copyESMBundle({ filepath: jsOutput });
        }
      });
    },
  };
}
