import { Project } from 'ts-morph';
import { printVisualSeparator } from 'tweedle';
import { getProjectRoot } from '../utils/get-project-root';
import { createWatcher } from '../utils/watcher';
import { BuildContext } from './types';
import { Logger } from '../utils/logger';

export async function createTypeChecker(ctx: BuildContext) {
  const project = new Project({
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      declarationDir: `${ctx.outdir}/types`,
    },
    tsConfigFilePath: ctx.tsconfig,
  });

  if (ctx.typecheck) {
    Logger.typeCheck.info('Running type-checker...');
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
        const shouldRunTypeScriptDiagnostics = changedPaths.find((path) => allSourceFiles.includes(path));

        if (shouldRunTypeScriptDiagnostics) {
          Logger.typeCheck.info('File change detected; running type-checker...');
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
    Logger.typeCheck.success('No type errors found.');
  }
}
