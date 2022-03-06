import doDecamelize from 'decamelize';
import parseArgs from 'yargs-parser';
import { createError } from '../utils/errors-warnings';
import { filterNilValues } from '../utils/filter-nil-values';

export type ValueType = string | string[] | number | number[] | boolean;

type FlagType<T extends ValueType = ValueType> = T extends string
  ? StringConstructor
  : T extends string[]
  ? [StringConstructor]
  : T extends number
  ? NumberConstructor
  : T extends number[]
  ? [NumberConstructor]
  : T extends boolean
  ? BooleanConstructor
  : StringConstructor | NumberConstructor | BooleanConstructor;

/**
 * Configuration to modify the behavior of flag-based data inputs.
 */
type BaseFlag<T extends ValueType = ValueType> = {
  /**
   * A factory function to transform raw command-line input
   * into the requisite native type (string, boolean, or number).
   */
  readonly type: FlagType<T>;

  /**
   * A single-character alias which can be used to assign the CLI flag in an
   * abbreviated way. For example, `--help` has the alias `h`, which can be used
   * like `-h`.
   */
  readonly alias?: string;

  /**
   * A help-text description for this flag.
   */
  readonly description: string;

  /**
   * An optional validation function that may return an error message
   * to be raised indicating invalid command-line input.
   */
  readonly validate?: (value: T) => (string | boolean | Promise<string | boolean>) | undefined;

  /**
   * Provides a default value for the flag.
   */
  readonly default?: T | (() => T | Promise<T>);

  /**
   * Explicitly sets a label for the flag's default descriptor.
   */
  readonly defaultDescriptor?: string;

  /**
   * Marks a flag as required.
   */
  readonly required?: boolean;
};

/**
 * Configuration to modify the behavior of flag-based data inputs.
 */
type RequiredFlag<T extends ValueType = ValueType> =
  | (BaseFlag<T> & {
      /**
       * Provides a default value for the flag.
       */
      readonly default?: void;

      /**
       * Marks a flag as required.
       */
      readonly required: true;
    })
  | (BaseFlag<T> & {
      /**
       * Provides a default value for the flag.
       */
      readonly default: T | (() => T | Promise<T>);

      /**
       * Marks a flag as required.
       */
      readonly required?: false;
    });

/**
 * Configuration to modify the behavior of flag-based data inputs.
 */
export type Flag<T extends ValueType = ValueType> = BaseFlag<T> | RequiredFlag<T>;

/**
 * A record of `Flag` values with data types given by `T`.
 */
export type Flags<T extends Record<string, ValueType | null | undefined> = Record<string, any>> = {
  [P in keyof Required<T>]: undefined extends T[P]
    ? BaseFlag<NonNullable<T[P]>>
    : null extends T[P]
    ? BaseFlag<NonNullable<T[P]>>
    : RequiredFlag<NonNullable<T[P]>>;
};

export type TypedFlags<F extends Flags> = F extends Flags<infer R> ? R : unknown;

/**
 * Parse and validate input given by the user via CLI flags.
 */
export async function parseFlags<T extends Flags>(
  input: string,
  flags: T,
): Promise<{ data: TypedFlags<T>; defaults: Record<string, any> }> {
  const aliases: Record<string, string[]> = {};
  const booleans: string[] = [];

  Object.entries(flags).forEach(([flag, options]) => {
    if (options.alias) {
      aliases[flag] = [options.alias];
    }

    if (options.type === Boolean) {
      booleans.push(flag);
    }
  });

  const results: {} = parseArgs(input, {
    alias: aliases,
    boolean: booleans,
  });

  const [defaultResults, validatedResults] = await Promise.all([
    getDefaults(flags),
    validateFlagInputs(flags, results),
  ]);

  return {
    data: { ...defaultResults, ...validatedResults },
    defaults: defaultResults,
  };
}

async function getDefaults<T extends Flags>(flags: T) {
  return filterNilValues<TypedFlags<T>>(
    Object.fromEntries(
      await Promise.all(
        Object.keys(flags)
          .filter((flag) => flags[flag].default != null)
          .map(async (key) => {
            const flag = flags[key] as unknown as Flag;
            return [key, typeof flag.default === 'function' ? await flag.default() : flag.default];
          }),
      ),
    ) as TypedFlags<T>,
  );
}

async function validateFlagInputs<T extends Flags>(flags: T, data: {} = {}) {
  // Validate flags with `required: true`...
  const missingRequiredFlags = Object.keys(flags).filter((key) => flags[key].required && (data as any)[key] == null);
  if (missingRequiredFlags.length) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `Missing required flag(s): ${missingRequiredFlags.map((flag) => `--${decamelize(flag)}`).join(', ')}`,
    });
  }

  // Validate/coerce types for all other flags...
  return filterNilValues<TypedFlags<T>>(
    Object.fromEntries(
      await Promise.all(
        Object.entries(data).map(async ([key, value]) => {
          const flag = flags[key] as unknown as Flag;

          if (flag) {
            // Coerce result type
            const typeFactory = flag.type;
            let result: any;
            if (Array.isArray(typeFactory)) {
              result = Array.isArray(value) ? value.map((i) => typeFactory[0](i)) : [typeFactory[0](value)];
            } else {
              // In the case that we expect the flag argument to NOT be an
              // array, but we receive multiple instances of the flag anyway,
              // we simply use the last instance.
              result = Array.isArray(value) ? typeFactory(value[value.length - 1]) : typeFactory(value);
            }

            // Validate results
            const invalidMessage = await flag.validate?.(result);

            if (invalidMessage && typeof invalidMessage === 'string') {
              throw createError({
                code: 'VALIDATION_ERROR',
                message: invalidMessage,
              });
            } else if (!invalidMessage && typeof invalidMessage === 'boolean') {
              throw createError({
                code: 'VALIDATION_ERROR',
                message: `--${decamelize(key)} received invalid input.`,
              });
            }

            return [key, result ?? (typeof flag.default === 'function' ? await flag.default() : flag.default)];
          }

          // Return undefined if no flag is defined (we filter it out)
          return [key, undefined];
        }),
      ),
    ),
  );
}

function decamelize(key: string) {
  return doDecamelize(key, { separator: '-' });
}
