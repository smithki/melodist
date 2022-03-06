import type { Format, Platform } from 'esbuild';
import {
  createCommand,
  FlagCollection,
  FlagCollectionData,
  PositionalArgCollection,
  PositionalArgCollectionData,
} from 'tweedle';
import { bundle, getDefaultExternals } from '../utils/esbuild';
import { sayHello } from '../utils/say-hello';

export interface BuildOptions extends FlagCollectionData {
  srcdir: string;
  outdir: string;
  output: Format[];
  platform: Platform;
  external: string[];
  global: string[];
  define: string[];
  name?: string;
  sourcemap?: boolean;
}

export const flags: FlagCollection<BuildOptions> = {
  srcdir: {
    type: String,
    description: '',
    default: './src',
  },

  outdir: {
    type: String,
    description: '',
    default: '.melodist',
  },

  output: {
    type: [String],
    description: '',
    alias: 'o',
    default: ['cjs', 'esm'],
  },

  platform: {
    type: String,
    description: '',
    default: 'neutral',
    validate: (input) => {
      if (!['browser', 'node', 'neutral'].includes(input)) {
        return 'Platform must be one of: browser, node, neutral';
      }
    },
  },

  external: {
    type: [String],
    description: '',
    alias: 'e',
    default: () => getDefaultExternals(),
    defaultDescriptor: 'inferred from `package.json#dependencies` and `package.json#peerDependencies`',
  },

  global: {
    type: [String],
    description: '',
    alias: 'g',
    default: [],
  },

  define: {
    type: [String],
    description: '',
    alias: 'd',
    default: [],
  },

  name: {
    type: String,
    description: '',
  },

  sourcemap: {
    type: Boolean,
    description: '',
    default: true,
  },
};

interface BuildArgs extends PositionalArgCollectionData {
  asdfasdf: 'string' | 'asdf';
  asdfasdfasdfa: string;
}

const positionalArgs: PositionalArgCollection<BuildArgs> = {
  asdfasdf: {
    description: '',
    default: '',
  },

  asdfasdfasdfa: {
    description: '',
    default: '',
  },
};

export default createCommand(
  {
    command: 'build',
    flags,
    positionalArgs,
    variadicArg: {
      description: 'asdf',
    },
  },

  async (data) => {
    console.log('data', data);
    sayHello('build');
    await build({ data });
  },
);

export async function build(options: { data: BuildOptions; watch?: boolean }) {
  const { data, watch } = options;

  await Promise.all(
    data.output.map((output, i) => {
      return bundle({
        // Special options
        watch,
        printMeta: i === 0,

        // Build options
        srcdir: data.srcdir,
        outdir: data.outdir,
        platform: data.platform,
        external: data.external,
        format: output,
        global: data.global,
        define: data.define,
        name: data.name,
        sourcemap: data.sourcemap,
      });
    }),
  );
}
