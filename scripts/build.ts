#!/usr/bin/env ts-node-script

import glob from 'fast-glob';
import { build } from 'esbuild';
import { Project } from 'ts-morph';

const isWatchMode = process.argv.includes('--watch');

const project = new Project({
  compilerOptions: {
    rootDir: 'src',
    declaration: true,
    emitDeclarationOnly: true,
    declarationDir: 'dist/types',
  },
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths(['src/**/*.ts', 'src/**/*.tsx']);

async function checkTypes() {
  const diagnostics = project.getPreEmitDiagnostics();

  if (diagnostics.length) {
    console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));
  }
}

(async () => {
  if (isWatchMode) console.clear();

  // Inital type-check
  await checkTypes();

  // Bundle with ESBuild
  await build({
    entryPoints: ['src/router.ts', ...(await glob('src/commands/*.ts'))],
    outdir: 'dist',
    bundle: true,
    minify: !isWatchMode,
    target: 'es6',
    platform: 'node',
    format: 'cjs',
    external: ['esbuild'],
    watch: isWatchMode
      ? {
          onRebuild: async (error) => {
            if (error) {
              console.error('watch build failed:', error);
            } else {
              console.clear();
              await Promise.all(project.getSourceFiles().map((sourceFile) => sourceFile.refreshFromFileSystem()));
              await checkTypes();
              console.log('⚡️ Built');
            }
          },
        }
      : undefined,
  });

  console.log('⚡️ Built');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
