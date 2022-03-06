import fs from 'fs';
import chalk from 'chalk';
import { printHelp } from './help-text';
import { resolveToRoot } from '../utils/path-helpers';
import { parseFlags, Flags, TypedFlags } from './flags';
import { BINARY } from '../constants';
import { printError } from '../utils/errors-warnings';
import { getVersion } from '../utils/get-version';

interface GlobalOptions {
  help?: boolean;
  version?: boolean;
  [key: string]: any;
}

const globalOptions: Flags<GlobalOptions> = {
  help: {
    type: Boolean,
    alias: 'h',
    description: chalk`Show help text (you're lookin' at it).`,
  },

  version: {
    type: Boolean,
    alias: 'v',
    description: `Show which version of \`${BINARY}\` is currently in use.`,
  },
};

interface CreateCommandOptions<T extends Flags> {
  command: string;
  flags: T;
  examples: string[];
  executor: (data: TypedFlags<T>) => void | Promise<void>;
}

export function createCommand<T extends Flags>(options: CreateCommandOptions<T>) {
  return async (input: string) => {
    const allFlags = {
      ...(options.flags ?? {}),
      ...globalOptions,
    } as Flags<GlobalOptions> & T;

    const parsedFlags = await parseFlags(input, allFlags);

    const { version, help, ...data } = parsedFlags.data as TypedFlags<T> & TypedFlags<Flags<GlobalOptions>>;

    if (version) {
      console.log(getVersion());
      process.exit(0);
    }

    if (help) {
      printHelp({
        command: options.command,
        flags: allFlags,
        examples: options.examples,
        defaultData: parsedFlags.defaults,
      });
      process.exit(0);
    }

    await options.executor(data as TypedFlags<T>);
  };
}
