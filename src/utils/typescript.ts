import { Project } from 'ts-morph';

export type { Project };

export function createProject(options: { srcdir: string; outdir: string; tsconfig: string }) {
  const project = new Project({
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      declarationDir: `${options.outdir}/types`,
    },
    tsConfigFilePath: options.tsconfig,
  });

  return project;
}

export async function checkTypesAndEmitDeclarations(project: Project) {
  await Promise.all(project.getSourceFiles().map((sourceFile) => sourceFile.refreshFromFileSystem()));

  const diagnostics = project.getPreEmitDiagnostics();

  if (diagnostics.length) {
    console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));
  }

  await project.emit();
}
