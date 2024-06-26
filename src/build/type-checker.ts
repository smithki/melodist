import { Project } from 'ts-morph';
import { Logger as FlikLogger } from 'flik';
import path from 'path';
import chalk from 'chalk';
import { getProjectRoot } from './resolvers';
import { createWatcher } from '../utils/watcher';
import { MelodistContext } from './types';
import { Logger } from '../utils/logger';
import { checkFileExists } from '../utils/check-file-exists';

export async function createTypeChecker(ctx: MelodistContext) {
  const tsconfigAbsolutePath = path.isAbsolute(ctx.tsconfig)
    ? ctx.tsconfig
    : path.join(await getProjectRoot(ctx.srcdir), ctx.tsconfig);

  if (!(await checkFileExists(tsconfigAbsolutePath))) return;

  const project = new Project({
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      declarationDir: ctx.typesdir,
    },
    tsConfigFilePath: ctx.tsconfig,
  });

  if (ctx.typecheck) {
    Logger.typeCheck.wait('Running type-checker...');
    await runTypeScriptDiagnostics(project);
  }

  await project.emit();

  if (ctx.watch) {
    const watcher = await createWatcher(await getProjectRoot(ctx.srcdir));
    watcher.addListener(async (err, events) => {
      if (err) {
        return;
      }

      if (ctx.typecheck) {
        const changedPaths = events.map((evt) => evt.path);
        const allSourceFiles: string[] = project.getSourceFiles().map((file) => file.getFilePath());
        const shouldRunTypeScriptDiagnostics = changedPaths.find((item) => allSourceFiles.includes(item));

        if (shouldRunTypeScriptDiagnostics) {
          Logger.typeCheck.wait('File change detected; running type-checker...');
          await runTypeScriptDiagnostics(project);
        }
      }

      await project.emit();
    });
  }
}

async function runTypeScriptDiagnostics(project: Project) {
  await Promise.all(project.getSourceFiles().map((sourceFile) => sourceFile.refreshFromFileSystem()));

  const diagnostics = project.getPreEmitDiagnostics();

  if (diagnostics.length) {
    Logger.typeCheck.error('Found type errors:');
    FlikLogger.visualSeparator();
    console.error(
      Logger.formatGroup(chalk.red('type errors'), project.formatDiagnosticsWithColorAndContext(diagnostics).trim()),
    );
    FlikLogger.visualSeparator();
  } else {
    Logger.typeCheck.complete('No type errors found.');
  }
}
