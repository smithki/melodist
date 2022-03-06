import chalk from 'chalk';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import fs from 'fs';
import path from 'path';
import { printVisualSeparator, printWarning } from 'tweedle';
import { checkFileExists } from './check-file-exists';

async function processEnv(filepath: string) {
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

  return { ...process.env, parsed };
}

/**
 * Using `env` as the target environment file,
 * parse and return environment data.
 */
export async function loadEnv(env?: string) {
  // We only load env during local development.
  // A value of "skip" flags that this build is happening in our deployment pipeline.
  if (env != null) {
    const filepath = path.resolve(process.cwd(), env);

    if (!(await checkFileExists(filepath))) {
      printWarning(chalk`Skipped environment (file doesn't exist: {cyan ${env}})`);
      printVisualSeparator();
      return { ...process.env };
    }

    return processEnv(filepath);
  }

  return { ...process.env };
}
