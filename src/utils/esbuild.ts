import chalk from 'chalk';
import esbuild, { BuildFailure, BuildOptions as ESBuildOptions, BuildResult, Format, Plugin } from 'esbuild';
import gzipSize from 'gzip-size';
import brotliSize from 'brotli-size';
import prettyBytes from 'pretty-bytes';
import fs from 'fs';
import path from 'path';
import { checkFileExists } from './check-file-exists';

interface BuildOptions extends Pick<ESBuildOptions, 'platform' | 'external' | 'format' | 'sourcemap'> {
  srcdir: string;
  outdir: string;
  global: string[];
  define: string[];
  name?: string;
  watch?: boolean;
  printMeta?: boolean;
}

/**
 * Bundle with ESBuild.
 */
export async function bundle(options: BuildOptions) {
  const { srcdir, outdir, global, define, name, watch, printMeta, ...rest } = options;

  // Bundle with ESBuild
  await esbuild.build({
    ...rest,
    bundle: true,
    target: 'es6',
    minify: !watch,
    outfile: await getOutfile(options),
    entryPoints: [await getEntrypoint(options)],
    plugins: [...globalsPlugin(Object.fromEntries(global.map((g) => g.split('='))) || {})],
    define: Object.fromEntries(
      define.map((d) => d.split('=')).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
    ),
    watch: watch ? { onRebuild: onRebuildFactory(options) } : undefined,

    // We need this footer because: https://github.com/evanw/esbuild/issues/1182
    footer:
      options.format === 'iife' && !!name
        ? {
            // This snippet replaces `window.{name}` with
            // `window.{name}.default`, with any additional named exports
            // assigned. Finally, it removes `window.{name}.default`.
            js: `if (${name} && ${options.name}.default != null) { ${name} = Object.assign(${name}.default, ${name}); delete ${name}.default; }`,
          }
        : undefined,
  });

  await printOutputSizeInfo(options);
  await createESMCompatBundle(options);
}

/**
 * Returns a function that can be used to handle rebuild events from ESBuild.
 */
function onRebuildFactory(options: BuildOptions) {
  return async (error: BuildFailure | null, result: BuildResult | null) => {
    if (options.printMeta) console.log('------');
    if (error) {
      console.error(error.message);
    } else {
      await printOutputSizeInfo(options);
      await createESMCompatBundle(options);
      // await Promise.all(project.getSourceFiles().map((sourceFile) => sourceFile.refreshFromFileSystem()));
      // await checkTypes();
      // console.log('⚡️ Built');
    }
  };
}

/**
 * Copy ESM bundle to `.mjs` file.
 */
async function createESMCompatBundle(options: BuildOptions) {
  if (options.format === 'esm') {
    const outfile = await getOutfile(options);
    if (outfile.endsWith('cjs')) {
      await fs.promises.copyFile(outfile, path.join(path.dirname(outfile), 'index.js'));
    } else {
      await fs.promises.copyFile(outfile, path.join(path.dirname(outfile), 'index.mjs'));
    }
  }
}

/**
 * Infer default bundle externals based on the consumer `package.json`.
 */
export async function getDefaultExternals(): Promise<string[]> {
  const pkgJson = await getPackageJson();
  const dependencies = Object.keys(pkgJson.dependencies || []);
  const peerDependencies = Object.keys(pkgJson.peerDependencies || []);
  return [...dependencies, ...peerDependencies];
}

/**
 * Parse the `package.json` file for the consumer
 * package (relative to `process.cwd()`).
 */
async function getPackageJson() {
  return JSON.parse((await fs.promises.readFile(path.resolve(process.cwd(), 'package.json'))).toString('utf-8'));
}

/**
 * Resolves the entrypoint file for ESBuild,
 * based on the format and target platform.
 */
async function getEntrypoint(options: BuildOptions) {
  const findEntrypoint = async (indexTarget?: string) => {
    if (options.format && (await checkFileExists(`${options.srcdir}/index.${indexTarget}.ts`))) {
      return `${options.srcdir}/index.${indexTarget}.ts`;
    }
    return `${options.srcdir}/index.ts`;
  };

  return findEntrypoint(options.format);
}

/**
 * Get a formatted, destination outfile.
 */
async function getOutfile(options: BuildOptions) {
  const ext = (await getPackageJson()).type === 'module' ? 'cjs' : 'js';
  return path.join(process.cwd(), options.outdir, options.format!, `index.${ext}`);
}

/**
 * Creates a list of plugins to replace
 * externalized packages with a global variable.
 */
function globalsPlugin(globals: Record<string, string>): Plugin[] {
  return Object.entries(globals).map(([packageName, globalVar]) => {
    const namespace = `globals-plugin:${packageName}`;
    return {
      name: namespace,
      setup(builder) {
        builder.onResolve({ filter: new RegExp(`^${packageName}$`) }, (args) => ({
          path: args.path,
          namespace,
        }));

        builder.onLoad({ filter: /.*/, namespace }, () => {
          const contents = `module.exports = ${globalVar}`;
          return { contents };
        });
      },
    };
  });
}

/**
 * Prints the size of the output file(s) produced by ESBuild.
 */
async function printOutputSizeInfo(options: BuildOptions) {
  const outfile = await getOutfile(options);
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
