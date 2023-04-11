import chalk from 'chalk';
import { parse as dotenv, DotenvParseOutput } from 'dotenv';
import { DotenvExpandOptions, expand } from 'dotenv-expand';
import { shutdown } from 'flik';
import fs from 'fs';
import path from 'path';
import { checkFileExists } from '../utils/check-file-exists';
import { Logger } from '../utils/logger';
import { getProjectRoot } from './resolvers';

/**
 * Parses a `.env` file and interpolates variables using `dotenv-expand`.
 */
async function parseEnv(filepath: string): Promise<Record<string, string | undefined>> {
  const origEnv = { ...process.env };
  const parsed: DotenvParseOutput = {};

  try {
    let result: DotenvExpandOptions = { ignoreProcessEnv: false };
    const envFileContents = await fs.promises.readFile(filepath, 'utf8');
    result.parsed = dotenv(envFileContents);

    result = expand(result);

    for (const key of Object.keys(result.parsed || {})) {
      if (typeof parsed[key] === 'undefined' && typeof origEnv[key] === 'undefined') {
        parsed[key] = result.parsed?.[key]!;
      }
    }
  } catch (err: any) {
    Logger.env.error(err.message);
    await shutdown(1);
  }

  return { ...parsed };
}

/**
 * Using `env` as the target environment file,
 * parse and return environment data.
 */
export async function loadEnv(env?: string): Promise<Record<string, string | undefined>> {
  if (env != null) {
    const filepath = path.resolve(await getProjectRoot(), env);

    if (await checkFileExists(filepath)) {
      return parseEnv(filepath).then((result) => {
        Logger.env.success(chalk`Loaded environment (from: {cyan ${env}})`);
        return result;
      });
    }

    Logger.env.warn(chalk`Skipped environment (file doesn't exist: {cyan ${env}})`);
    return {};
  }

  return {};
}

/**
 * Takes an environment definition (`env`, loaded using `loadEnv()`) and applies
 * those definitions to the following globals:
 *
 *   - process.env.{key}
 *   - global.process.env.{key}
 *   - globalThis.process.env.{key}
 *   - import.meta.env.{key}
 */
export function defineEnv(env: Record<string, string | undefined> = {}): Record<string, string> {
  type DefinitionEntry = Array<[string, string]>;

  const createDefinition = (key: string, value: string): DefinitionEntry => {
    return [
      [`process.${key}`, value],
      [`global.process.${key}`, value],
      [`globalThis.process.${key}`, value],
      [`import.meta.${key}`, value],
    ];
  };

  return Object.fromEntries([
    ...Object.entries(env).reduce(
      (entries, [key, value]) => entries.concat(createDefinition(`env.${key}`, JSON.stringify(value))),
      [] as DefinitionEntry,
    ),
    ...createDefinition(`env`, JSON.stringify(env)),
  ]);
}
