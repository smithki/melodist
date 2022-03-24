import chalk from 'chalk';
import { parse as parseDotenvFile, DotenvParseOutput, DotenvConfigOutput } from 'dotenv';
import { expand } from 'dotenv-expand';
import fs from 'fs';
import path from 'path';
import { checkFileExists } from '../utils/check-file-exists';
import { Logger } from '../utils/logger';

async function dotenv(filepath: string): Promise<Record<string, string | undefined>> {
  const origEnv = { ...process.env };
  const parsed: DotenvParseOutput = {};

  try {
    let result: DotenvConfigOutput = {};
    const envFileContents = await fs.promises.readFile(filepath, 'utf8');
    result.parsed = parseDotenvFile(envFileContents);

    result = expand(result);

    for (const key of Object.keys(result.parsed || {})) {
      if (typeof parsed[key] === 'undefined' && typeof origEnv[key] === 'undefined') {
        parsed[key] = result.parsed?.[key]!;
      }
    }
  } catch (err: any) {
    throw new Error(`Encountered a problem loading environment: ${err.message}`, { cause: err });
  }

  return { ...parsed };
}

/**
 * Using `env` as the target environment file,
 * parse and return environment data.
 */
export async function loadEnv(env?: string): Promise<Record<string, string | undefined>> {
  if (env != null) {
    const filepath = path.resolve(process.cwd(), env);

    if (!(await checkFileExists(filepath))) {
      Logger.env.warn(chalk`Skipped environment (file doesn't exist: {cyan ${env}})`);
      return {};
    }

    return dotenv(filepath).then((result) => {
      Logger.env.success(chalk`Loaded environment (from: {cyan ${env}})`);
      return result;
    });
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
