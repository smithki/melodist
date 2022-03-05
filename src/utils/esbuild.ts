import esbuild from 'esbuild';

interface BuildOptions {
  entryPoints: string[];
  outdir: string;
  platform: 'browser' | 'node' | 'neutral';
}

export async function build(options: BuildOptions) {
  // Bundle with ESBuild
  await esbuild.build({
    entryPoints: options.entryPoints,
    outdir: options.outdir,
    bundle: true,
    // minify: !isWatchMode,
    target: 'es6',
    platform: 'node',
    format: 'cjs',
    // watch: isWatchMode
    //   ? {
    //       onRebuild: async (error) => {
    //         if (error) {
    //           console.error('watch build failed:', error);
    //         } else {
    //           console.clear();
    //           await Promise.all(project.getSourceFiles().map((sourceFile) => sourceFile.refreshFromFileSystem()));
    //           await checkTypes();
    //           console.log('⚡️ Built');
    //         }
    //       },
    //     }
    //   : undefined,
  });
}
