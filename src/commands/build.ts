import chalk from 'chalk';
import type { Platform } from 'esbuild';
import { createCommand, Inputs } from 'flik';
import { bundle } from '../build/bundle';
import { loadEnv } from '../build/env';
import { sayHello } from '../utils/logger';

export interface BuildOptions extends Inputs.FlagData {
  outdir: string;
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
    examples: ['test one two three'],
  },

  async ({ data, shutdown, addShutdownTask }) => {
    sayHello('build');
    try {
      const cleanups = await build({ data });
      addShutdownTask(async () => {
        await Promise.all(cleanups);
      });
    } catch {
      shutdown(1);
    }
    shutdown();
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
        outdir: data.outdir,
        platform: format === 'iife' ? 'browser' : format === 'rn' ? 'node' : data.platform,
        external: format === 'iife' ? data['external:iife'] ?? data.external : data.external,
        global: data.global,
        name: data.name,
        sourcemap: data.sourcemap,
        tsconfig: data.tsconfig,
        typecheck: data.typecheck && i === 0,
        esTarget: data.esTarget,
        minify: data.minify,
        format: format === 'rn' ? 'cjs' : format,
        mainFields: format === 'rn' ? ['react-native', 'main', 'module'] : undefined,
        css: format !== 'rn',
        define,
      });
    }),
  );
}
