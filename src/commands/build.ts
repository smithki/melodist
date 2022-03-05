import { createCommand } from '../cli/create-command';
import { Flags } from '../cli/flags';
import { build } from '../utils/esbuild';

export interface BuildOptions {
  entry: string[];
  outdir: string;
  platform: 'browser' | 'node' | 'neutral';
  [key: string]: any;
}

export const flags: Flags<BuildOptions> = {
  entry: {
    type: [String],
    description: '',
    default: [],
  },

  outdir: {
    type: String,
    description: '',
    default: '.melodist',
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
};

export default createCommand({
  command: 'build',
  flags,
  examples: [],
  executor: async (data) => {
    console.log(data);
    await build({
      entryPoints: data.entry,
      outdir: data.outdir,
      platform: data.platform,
    });
    console.log('foo', data);
  },
});
