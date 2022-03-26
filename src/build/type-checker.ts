import { Project } from 'ts-morph';
import { printVisualSeparator } from 'flik';
import path from 'path';
import { getProjectRoot } from '../utils/get-project-root';
import { createWatcher } from '../utils/watcher';
import { BuildContext } from './types';
import { Logger } from '../utils/logger';
import { checkFileExists } from '../utils/check-file-exists';

export async function createTypeChecker(ctx: BuildContext) {
  const tsconfigAbsolutePath = path.isAbsolute(ctx.tsconfig)
    ? ctx.tsconfig
    : path.join(await getProjectRoot(ctx.srcdir), ctx.tsconfig);

  if (!(await checkFileExists(tsconfigAbsolutePath))) return;

  const project = new Project({
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      declarationDir: `${ctx.outdir}/types`,
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
    printVisualSeparator();
    console.error(project.formatDiagnosticsWithColorAndContext(diagnostics));
    printVisualSeparator();
  } else {
    Logger.typeCheck.complete('No type errors found.');
  }
}
