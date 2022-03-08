import chalk from 'chalk';
import type { Format, Platform } from 'esbuild';
import {
  createCommand,
  FlagCollection,
  FlagCollectionData,
  PositionalArgCollection,
  PositionalArgCollectionData,
  printError,
} from 'tweedle';
import { bundle } from '../build/bundle';
import { loadEnv } from '../build/load-env';
import { sayHello } from '../utils/say-hello';

export interface BuildOptions extends FlagCollectionData {
  outdir: string;
  format: Format[];
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
}

export const flags: FlagCollection<BuildOptions> = {
  outdir: {
    type: String,
    description: 'Directory where output shall be placed.',
    alias: 'o',
    default: '.melodist',
  },

  format: {
    type: [String],
    description: 'A list of output formats that should be produced.',
    alias: 'f',
    default: ['cjs', 'esm'],
  },

  platform: {
    type: String,
    description: 'Target platform (one of: browser, node, neutral).',
    alias: 'p',
    default: 'neutral',
    validate: (input) => {
      if (!['browser', 'node', 'neutral'].includes(input)) {
        return 'Platform must be one of: browser, node, neutral';
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
    default: '.env',
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
};

export interface BuildArgs extends PositionalArgCollectionData {
  srcdir: string;
}

export const positionalArgs: PositionalArgCollection<BuildArgs> = {
  srcdir: {
    description: 'Directory where input shall be consumed from.',
    default: './src',
  },
};

export default createCommand(
  {
    command: 'build',
    description: 'Build command',
    flags,
    positionalArgs,
    examples: ['test one two three'],
  },

  async (data) => {
    sayHello('build');
    await build({ data });
    process.exit(1);
  },
);

export async function build(options: { data: BuildOptions & BuildArgs; watch?: boolean }) {
  const { data, watch } = options;

  const define = await loadEnv(data.env);

  await Promise.all(
    data.format.map(async (format, i) => {
      return bundle({
        watch,
        isInitialBuildInstance: i === 0,
        srcdir: data.srcdir,
        outdir: data.outdir,
        platform: data.platform,
        external: format === 'iife' ? data['external:iife'] ?? data.external : data.external,
        global: data.global,
        name: data.name,
        sourcemap: data.sourcemap,
        tsconfig: data.tsconfig,
        typecheck: data.typecheck,
        format,
        define,
      }).catch((err) => {
        printError(new Error(chalk`Failed to build ${chalk.rgb(0, 255, 255)(format)}.`));
        throw err;
      });
    }),
  );
}
