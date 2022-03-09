import chalk from 'chalk';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import fs from 'fs';
import path from 'path';
import { checkFileExists } from '../utils/check-file-exists';
import { Logger } from '../utils/logger';

async function processEnv(filepath: string): Promise<Record<string, string | undefined>> {
  const origEnv = { ...process.env };
  const parsed: dotenv.DotenvParseOutput = {};

  try {
    let result: dotenv.DotenvConfigOutput = {};
    const envFileContents = await fs.promises.readFile(filepath, 'utf8');
    result.parsed = dotenv.parse(envFileContents);

    result = expand(result);

    for (const key of Object.keys(result.parsed || {})) {
      if (typeof parsed[key] === 'undefined' && typeof origEnv[key] === 'undefined') {
        parsed[key] = result.parsed?.[key]!;
      }
    }
  } catch (err: any) {
    throw new Error(`Encountered a problem loading environment: ${err.message}`, { cause: err });
  }

  return { ...process.env, ...parsed };
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
      return { ...process.env };
    }

    return processEnv(filepath).then((result) => {
      Logger.env.success(chalk`Loaded environment (from: {cyan ${env}})`);
      return result;
    });
  }

  return { ...process.env };
}
