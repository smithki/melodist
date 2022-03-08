import { Plugin } from 'esbuild';
import { Project } from 'ts-morph';
import { BuildContext } from '../types';

function createProject(ctx: BuildContext) {
  const project = new Project({
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      declarationDir: `${ctx.outdir}/types`,
    },
    tsConfigFilePath: ctx.tsconfig,
  });

  return project;
}

async function checkTypesAndEmitDeclarations(project: Project) {
  await Promise.all(project.getSourceFiles().map((sourceFile) => sourceFile.refreshFromFileSystem()));

  const diagnostics = project.getPreEmitDiagnostics();

  if (diagnostics.length) {
    console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));
  }

  await project.emit();
}

/**
 * Perform type-checking and generate type
 * definitions based on files resolved in the bundle.
 */
export function typescriptPlugin(ctx: BuildContext): Plugin {
  const namespace = `melodist.typescript`;
  const tsProject = createProject(ctx);

  return {
    name: namespace,
    setup: (build) => {
      build.onStart(async () => {
        await checkTypesAndEmitDeclarations(tsProject);
      });
    },
  };
}
