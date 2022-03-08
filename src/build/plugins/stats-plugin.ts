import { Format, Plugin } from 'esbuild';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import prettyBytes from 'pretty-bytes';
import gzipSize from 'gzip-size';
import brotliSize from 'brotli-size';
import { resolveOutfile } from '../resolvers';
import { BuildContext } from '../types';

/**
 * Prints the size of the output file(s) produced by ESBuild.
 */
async function printOutputSizeInfo(options: BuildContext) {
  const outfile = await resolveOutfile(options);
  const sizeInfo = await getSizeInfo((await fs.promises.readFile(outfile)).toString(), outfile, options.format);

  const outdir = path.relative(process.cwd(), path.dirname(outfile));
  console.log(chalk`Built {rgb(0,255,255) ${options.format}} to {gray ${outdir}}`);
  console.log(sizeInfo);
}

/**
 * Returns the GZIP and BROTLI sizes of the generated bundle.
 */
async function getSizeInfo(code: string, filename: string, format?: Format) {
  const raw = code.length < 5000;

  const formatSize = (size: number | null, type: 'gz' | 'br') => {
    if (size == null) return '';
    const pretty = raw ? `${size} B` : prettyBytes(size);
    // eslint-disable-next-line no-nested-ternary
    const color = size < 5000 ? chalk.green : size > 40000 ? chalk.red : chalk.yellow;
    return format === 'esm'
      ? `${color(pretty)}: ${chalk.white(path.basename(filename).replace('js', '(m)js'))}.${type}`
      : `${color(pretty)}: ${chalk.white(path.basename(filename))}.${type}`;
  };

  const [gzip, brotli] = await Promise.all([gzipSize(code).catch(() => null), brotliSize(code).catch(() => null)]);

  const out = [formatSize(gzip, 'gz'), formatSize(brotli, 'br')].join('\n  ');
  return `  ${out}`;
}

/**
 * Perform type-checking and generate type
 * definitions based on files resolved in the bundle.
 */
export function statsPlugin(options: BuildContext): Plugin {
  const namespace = `melodist.stats`;

  return {
    name: namespace,
    setup: (build) => {
      let isInitialBuild = true;

      build.onStart(() => {
        if (options.isInitialBuildInstance && !isInitialBuild) {
          console.log(chalk`\n{dim ❮❮❮} rebuilding {dim ❯❯❯}\n`);
        }

        isInitialBuild = false;
      });

      build.onEnd(async () => {
        await printOutputSizeInfo(options);
      });
    },
  };
}
