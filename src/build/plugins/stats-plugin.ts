import { Plugin } from 'esbuild';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import prettyBytes from 'pretty-bytes';
import gzipSize from 'gzip-size';
import brotliSize from 'brotli-size';
import { resolveOutDir } from '../resolvers';
import { BuildContext } from '../types';

/**
 * Prints the size of the output file(s) produced by ESBuild.
 */
async function printOutputSizeInfo(ctx: BuildContext, options: { filepaths?: Array<string | undefined> }) {
  const { filepaths = [] } = options;
  if (!filepaths.length) return;

  const sizeInfos = await Promise.all(
    (filepaths.filter(Boolean) as string[]).map(async (filepath) => {
      const code = (await fs.promises.readFile(filepath)).toString();
      return getSizeInfo(ctx, { code, filepath });
    }),
  );

  if (sizeInfos.length) {
    const outdir = await resolveOutDir(ctx);
    console.log(chalk`Built {rgb(0,255,255) ${ctx.format}} to {gray ${outdir}}`);
    console.log(sizeInfos.join('\n'));
  }
}

/**
 * Returns the GZIP and BROTLI sizes of the generated bundle.
 */
async function getSizeInfo(ctx: BuildContext, options: { code: string; filepath: string }) {
  const { code, filepath } = options;
  const raw = code.length < 5000;

  const formatSize = (size: number | null, type: 'gz' | 'br') => {
    if (size == null) return '';
    const pretty = raw ? `${size} B` : prettyBytes(size);
    // eslint-disable-next-line no-nested-ternary
    const color = size < 5000 ? chalk.green : size > 40000 ? chalk.red : chalk.yellow;
    return ctx.format === 'esm'
      ? `${color(pretty)}: ${chalk.white(path.basename(filepath).replace('js', '(m)js'))}.${type}`
      : `${color(pretty)}: ${chalk.white(path.basename(filepath))}.${type}`;
  };

  const [gzip, brotli] = await Promise.all([gzipSize(code).catch(() => null), brotliSize(code).catch(() => null)]);

  const out = [formatSize(gzip, 'gz'), formatSize(brotli, 'br')].join('\n  ');
  return `  ${out}`;
}

/**
 * Perform type-checking and generate type
 * definitions based on files resolved in the bundle.
 */
export function statsPlugin(ctx: BuildContext): Plugin {
  const namespace = `melodist.stats`;

  return {
    name: namespace,
    setup: (build) => {
      let isInitialBuild = true;

      build.onStart(() => {
        if (ctx.isInitialBuildInstance && !isInitialBuild) {
          console.log(chalk`\n{dim ❮❮❮} rebuilding {dim ❯❯❯}\n`);
        }

        isInitialBuild = false;
      });

      build.onEnd(async (result) => {
        const outputs = Object.keys(result.metafile?.outputs ?? {});
        const jsOutput = outputs.find((o) => o.endsWith('js'));
        const cssOutput = outputs.find((o) => o.endsWith('css'));
        await printOutputSizeInfo(ctx, { filepaths: [jsOutput, cssOutput] });
      });
    },
  };
}
