/* eslint-disable no-nested-ternary */

import { Plugin, Message } from 'esbuild';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import prettyBytes from 'pretty-bytes';
import gzipSize from 'gzip-size';
import brotliSize from 'brotli-size';
import { printVisualSeparator } from 'flik';
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
      return getSizeInfo(code);
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
async function getSizeInfo(code: string) {
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
  Logger.bundle.error(chalk`{red Build failed} ({cyan ${ctx.format}})`);
  printVisualSeparator();
  errors.forEach((err) => {
    console.error(formatError(err));
    printVisualSeparator();
  });
  printVisualSeparator();
}

function formatError(error: Message) {
  const result: string[] = [];

  result.push(
    error.location
      ? chalk`{cyan ${error.location?.file}}:{yellow ${error.location?.line}}:{yellow ${error.location?.column}} - ${error.text}`
      : error.text,
  );

  if (error.location) {
    result.push(
      chalk`\n{inverse ${error.location.line}} ${error.location.lineText}`,
      chalk.inverse(' ').repeat(String(error.location.line).length) +
        ' '.repeat(error.location.column + 1 || 0) +
        chalk.red('~').repeat(error.location?.length ?? 1),
    );
  }

  return result.join('\n');
}

/**
 * Perform type-checking and generate type
 * definitions based on files resolved in the bundle.
 */
export function statsPlugin(ctx: BuildContext): Plugin {
  const namespace = `melodist:stats`;

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
