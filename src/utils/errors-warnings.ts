import chalk from 'chalk';

export type MelodistErrorCode = `melodist/${Uppercase<string>}`;

export interface MelodistError extends Error {
  code: MelodistErrorCode;
}

/**
 * Prints a prefixed warning to the console.
 */
export function printWarning(message?: string) {
  console.warn(chalk`{yellow Warning:} ${message}`);
}

/**
 * Prints the given `error` message to the console.
 */
export function printError(error?: Error) {
  if (error && (error as MelodistError)?.code?.startsWith('melodist/')) {
    console.error(`\n${error.message}`);
  } else if (error) {
    console.error(error);
  }
}

/**
 * Creates a `MelodistError` object.
 */
export function createError(options: { code: Uppercase<string>; message: string; cause?: Error }) {
  const error = new Error(chalk`{red Error:} ${options.message}`, {
    cause: options.cause,
  });
  (error as MelodistError).code = `melodist/${options.code}`;

  return error as MelodistError;
}
