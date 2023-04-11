import chalk from 'chalk';
import type { Format, Platform } from 'esbuild';
import { createCommand, Inputs } from 'flik';
import path from 'path';
import { bundle } from '../build/bundle';
import { loadEnv } from '../build/env';
import { sayHello } from '../utils/logger';

export interface BuildOptions extends Inputs.FlagData {
  outdir: string;
  'outdir:iife'?: string;
  'outdir:cjs'?: string;
  'outdir:esm'?: string;
  'outdir:rn'?: string;
  format: Array<'iife' | 'cjs' | 'esm' | 'rn'>;
  esTarget: string;
  platform: Platform;
  external?: string[];
  'external:iife': string[];
  global: string[];
  'global:iife': string[];
  name?: string;
  sourcemap?: boolean;
  env?: string;
  tsconfig: string;
  typecheck?: boolean;
  minify: boolean;
}

export const flags: Inputs.FlagCollection<BuildOptions> = {
  outdir: {
    type: String,
    description: 'Directory where output shall be placed.',
    alias: 'o',
    default: '.melodist',
  },

  'outdir:iife': {
    type: String,
    description: chalk`Directory where output shall be placed {underline if --format=iife is in use}.`,
    alias: 'o:iife',
    defaultDescriptor: 'falls back to --outdir',
  },

  'outdir:cjs': {
    type: String,
    description: chalk`Directory where output shall be placed {underline if --format=cjs is in use}.`,
    alias: 'o:cjs',
    defaultDescriptor: 'falls back to --outdir',
  },

  'outdir:esm': {
    type: String,
    description: chalk`Directory where output shall be placed {underline if --format=esm is in use}.`,
    alias: 'o:esm',
    defaultDescriptor: 'falls back to --outdir',
  },

  'outdir:rn': {
    type: String,
    description: chalk`Directory where output shall be placed {underline if --format=rn is in use}.`,
    alias: 'o:rn',
    defaultDescriptor: 'falls back to --outdir',
  },

  format: {
    type: [String],
    description: 'A list of output formats that should be produced.',
    alias: 'f',
    validate: (input) => {
      const invalidInput = input.filter((item) => !['rn', 'cjs', 'esm', 'iife'].includes(item));
      return invalidInput.length
        ? `Format(s) must be some of: cjs, esm, iife, rn\nInvalid format(s) received: ${invalidInput.join(', ')}`
        : null;
    },
    default: ['cjs', 'esm'],
  },

  esTarget: {
    type: String,
    description: 'The EcmaScript syntax version to compile to.',
    default: 'esnext',
  },

  platform: {
    type: String,
    description: 'Target platform (one of: browser, node, neutral).',
    alias: 'p',
    default: 'neutral',
    validate: (input) => {
      if (!['browser', 'node', 'neutral'].includes(input)) {
        return `Platform must be one of: browser, node, neutral\nInvalid platform received: ${input}`;
      }
    },
  },

  external: {
    type: [String],
    description: 'Dependencies to be externalized.',
    alias: 'e',
    defaultDescriptor: 'inferred from `dependencies` and `peerDependencies`',
  },

  'external:iife': {
    type: [String],
    description: chalk`Dependencies to be externalized {underline if --format=iife is in use}.`,
    alias: 'e:iife',
    default: [],
    defaultDescriptor: 'falls back to --external',
  },

  global: {
    type: [String],
    description: chalk`Dependencies transpiled to global variables {italic (i.e.: --global react=React)}.`,
    alias: 'g',
    default: [],
  },

  'global:iife': {
    type: [String],
    description: chalk`Dependencies transpiled to global variables {underline if --format=iife is in use} {italic (i.e.: --global:iife react=React)}.`,
    alias: 'g:iife',
    default: [],
    defaultDescriptor: 'falls back to --global',
  },

  name: {
    type: String,
    description: 'A global variable name to use if --format=iife is in use.',
  },

  sourcemap: {
    type: Boolean,
    description: 'Generate sourcemaps.',
    default: true,
  },

  env: {
    type: String,
    description: 'ENV file from which to load environment data.',
  },

  tsconfig: {
    type: String,
    description: 'TSConfig file from which to load TypeScript configuration.',
    default: 'tsconfig.json',
  },

  typecheck: {
    type: Boolean,
    description: 'Whether to validate TypeScript typings at build time.',
    default: true,
  },

  minify: {
    type: Boolean,
    description: 'Whether to optimize bundles through code minification.',
    default: true,
  },
};

export interface BuildArgs extends Inputs.PositionalArgData {
  srcdir: string;
}

export const positionalArgs: Inputs.PositionalArgCollection<BuildArgs> = {
  srcdir: {
    description: 'Directory where input shall be consumed from.',
    default: './src',
  },
};

export default createCommand(
  {
    command: 'build',
    description: 'Build command',
    inputs: { flags, positionalArgs },
  },

  async ({ data, shutdown, addShutdownTask }) => {
    sayHello('build');
    try {
      const cleanups = await build({ data });
      addShutdownTask(async () => {
        await Promise.all(cleanups);
      });
    } catch {
      await shutdown(1);
    }
    await shutdown();
  },
);

export async function build(options: { data: BuildOptions & BuildArgs; watch?: boolean }) {
  const { data, watch } = options;

  const define = await loadEnv(data.env);

  return Promise.all(
    data.format.map(async (format, i) => {
      return bundle({
        watch,
        srcdir: data.srcdir,
        outdir: resolveFormatSpecificOutdir(format, data),
        platform: resolveFormatSpecificPlatform(format, data),
        external: resolveFormatSpecificBuildOption('external', format, data),
        global: resolveFormatSpecificBuildOption('global', format, data),
        name: data.name,
        sourcemap: data.sourcemap,
        tsconfig: data.tsconfig,
        typecheck: data.typecheck && i === 0,
        esTarget: data.esTarget,
        minify: data.minify,
        format: resolveOutputModuleFormat(format),
        mainFields: resolveFormatSpecificMainFields(format),
        css: doesSupportCSS(format),
        define,
      });
    }),
  );
}

type FormatFlag = BuildOptions['format'][number];

function resolveFormatSpecificBuildOption<Key extends keyof BuildOptions>(
  key: Key,
  format: FormatFlag,
  data: BuildOptions,
): BuildOptions[Key] {
  switch (format) {
    case 'iife':
      return data[`${key}:iife`] ?? data[key];

    case 'cjs':
      return data[`${key}:cjs`] ?? data[key];

    case 'esm':
      return data[`${key}:esm`] ?? data[key];

    case 'rn':
      return data[`${key}:rn`] ?? data[key];

    default:
      return data[key];
  }
}

function resolveFormatSpecificOutdir(format: FormatFlag, data: BuildOptions): string {
  const defaultOutdir = path.join(data.outdir, format);

  switch (format) {
    case 'iife':
      return resolveFormatSpecificBuildOption('outdir', 'iife', data) ?? defaultOutdir;

    case 'cjs':
      return resolveFormatSpecificBuildOption('outdir', 'cjs', data) ?? defaultOutdir;

    case 'esm':
      return resolveFormatSpecificBuildOption('outdir', 'esm', data) ?? defaultOutdir;

    case 'rn':
      return resolveFormatSpecificBuildOption('outdir', 'rn', data) ?? defaultOutdir;

    default:
      return defaultOutdir;
  }
}

function resolveFormatSpecificPlatform(format: FormatFlag, data: BuildOptions): Platform {
  switch (format) {
    case 'iife':
      return 'browser';

    case 'rn':
      return 'node';

    default:
      return data.platform;
  }
}

function resolveOutputModuleFormat(format: FormatFlag): Format {
  switch (format) {
    case 'rn':
      return 'cjs';

    default:
      return format;
  }
}

function resolveFormatSpecificMainFields(format: FormatFlag) {
  switch (format) {
    case 'rn':
      return ['react-native', 'main', 'module'];

    default:
      return undefined; // fall back to ESBuild default
  }
}

function doesSupportCSS(format: FormatFlag) {
  switch (format) {
    case 'rn':
      return false;

    default:
      return true;
  }
}
