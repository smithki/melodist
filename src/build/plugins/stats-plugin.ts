/* eslint-disable no-nested-ternary */

import { Plugin, Message } from 'esbuild';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import prettyBytes from 'pretty-bytes';
import gzipSize from 'gzip-size';
import brotliSize from 'brotli-size';
import { resolveOutDir } from '../resolvers';
import { BuildContext } from '../types';
import { Logger } from '../../utils/logger';

/**
 * Prints the size of the output file(s) produced by ESBuild.
 */
async function printOutputSizeInfo(ctx: BuildContext, options: { filepaths?: Array<string | undefined> }) {
  const { filepaths = [] } = options;
  if (!filepaths.length) return;

  const definedFilePaths = filepaths.filter(Boolean) as string[];

  const sizeInfos = await Promise.all(
    definedFilePaths.map(async (filepath) => {
      const code = (await fs.promises.readFile(filepath)).toString();
      return getSizeInfo(ctx, { code });
    }),
  );

  sizeInfos.forEach(async (size, i) => {
    const outdir = await resolveOutDir(ctx);
    const basenameNormalized =
      ctx.format === 'esm'
        ? path.basename(definedFilePaths[i]).replace('.js', '.(m)js')
        : path.basename(definedFilePaths[i]);

    Logger.bundle.info(
      chalk`Built {cyan ${ctx.format}} to {gray ${path.relative(
        process.cwd(),
        outdir,
      )}/}${basenameNormalized} {gray (}${size}{gray )}`,
    );
  });
}

/**
 * Returns the GZIP and BROTLI sizes of the generated bundle.
 */
async function getSizeInfo(ctx: BuildContext, options: { code: string }) {
  const { code } = options;
  const raw = code.length < 5000;

  const formatSize = (size: number | null, type: 'gz' | 'br') => {
    if (size == null) return '';
    const prettifiedSize = raw ? `${size} B` : prettyBytes(size);
    const color = size < 5000 ? chalk.green : size > 40000 ? chalk.red : chalk.yellow;
    return `${color(prettifiedSize)} ${type}`;
  };

  const [gzip, brotli] = await Promise.all([gzipSize(code).catch(() => null), brotliSize(code).catch(() => null)]);

  return [formatSize(gzip, 'gz'), formatSize(brotli, 'br')].join(chalk.gray(' / '));
}

async function reportErrors(ctx: BuildContext, errors: Message[]) {
  console.log(chalk`{red Build failed} ({cyan ${ctx.format}})`);
  errors.forEach((err) => console.log(err.text));
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
        if (ctx.watch && !isInitialBuild) {
          Logger.bundle.info(chalk`File change detected; rebuilding {cyan ${ctx.format}}`);
        }

        isInitialBuild = false;
      });

      build.onEnd(async (result) => {
        if (result.errors.length) {
          Logger.bundle.error(chalk`Errors detected ({cyan ${ctx.format}}):`);
          return reportErrors(ctx, result.errors);
        }

        const outputs = Object.keys(result.metafile?.outputs ?? {});
        const jsOutput = outputs.find((o) => o.endsWith('js'));
        const cssOutput = outputs.find((o) => o.endsWith('css'));
        await printOutputSizeInfo(ctx, { filepaths: [jsOutput, cssOutput] });
      });
    },
  };
}
