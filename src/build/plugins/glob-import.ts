import fastGlob from 'fast-glob';
import { Plugin } from 'esbuild';

/**
 * Enable glob import.
 */
export function globImport(): Plugin {
  const namespace = `melodist:glob-import`;
  const resolutionNamespace = `melodist:glob-import:resolve`;

  return {
    name: namespace,
    setup: (build) => {
      build.onResolve({ filter: /\*/ }, async (args) => {
        // Skip unresolvable paths
        if (args.resolveDir === '') {
          return;
        }

        return {
          path: args.path,
          namespace: resolutionNamespace,
          pluginData: { resolveDir: args.resolveDir },
        };
      });

      build.onLoad({ filter: /.*/, namespace: resolutionNamespace }, async (args) => {
        const files = (
          await fastGlob(args.path, {
            cwd: args.pluginData.resolveDir,
          })
        ).sort();

        const importStatements = files.map((filepath, i) => `import * as m_${i} from "${filepath}"`).join(';');
        const importedModulesArray = `[${files.map((_, i) => `m_${i}`).join(',')}]`;
        const importedFilenamesArray = `[${files.map((filepath) => JSON.stringify(filepath)).join(',')}]`;

        const contents = [
          importStatements,
          `const m = ${importedModulesArray};`,
          `export const filenames = ${importedFilenamesArray};`,
          'export default m;',
        ].join('\n');

        return { contents, resolveDir: args.pluginData.resolveDir };
      });
    },
  };
}
