import { Project } from 'ts-morph';

export type { Project };

export function createProject(options: { srcdir: string; outdir: string; tsconfig: string }) {
  const project = new Project({
    compilerOptions: {
      rootDir: options.srcdir,
      declaration: true,
      emitDeclarationOnly: true,
      declarationDir: `${options.outdir}/types`,
    },
    tsConfigFilePath: options.tsconfig,
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths([`${options.srcdir}/**/*.ts`, `${options.srcdir}/**/*.tsx`]);

  return project;
}

export async function checkTypes(project: Project) {
  const diagnostics = project.getPreEmitDiagnostics();
  if (diagnostics.length) {
    console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));
  }
}

export async function refreshProject(project: Project) {
  await Promise.all(project.getSourceFiles().map((sourceFile) => sourceFile.refreshFromFileSystem()));
}
