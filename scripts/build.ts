#!/usr/bin/env ts-node-script

import esbuild, { BuildOptions } from 'esbuild';
import { Project } from 'ts-morph';
import path from 'path';

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
  const buildContext = await esbuild.context<BuildOptions>({
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    bundle: true,
    minify: !isWatchMode,
    target: 'es6',
    platform: 'node',
    format: 'cjs',
    external: ['esbuild', 'ts-morph', 'lightningcss', '@parcel/watcher'],
    sourcemap: true,
    plugins: [
      {
        name: 'on-rebuild',
        setup(build) {
          build.onEnd(async (result) => {
            if (isWatchMode) {
              if (result.errors.length) {
                console.error('watch build failed:', result.errors);
              } else {
                console.clear();
                await Promise.all(project.getSourceFiles().map((sourceFile) => sourceFile.refreshFromFileSystem()));
                await checkTypes();
                console.log('⚡️ Built');
              }
            }
          });
        },
      },
    ],
  });

  if (isWatchMode) {
    await buildContext.watch();
  } else {
    await buildContext.rebuild();
    await buildContext.dispose();
    console.log('⚡️ Built');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
