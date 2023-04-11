import { getPackageJson } from './resolvers';

/**
 * Infer default bundle externals based on the consumer `package.json`.
 */
export async function getDefaultExternals(cwd: string): Promise<string[]> {
  const pkgJson = await getPackageJson(cwd);
  const dependencies = Object.keys(pkgJson.dependencies || []);
  const peerDependencies = Object.keys(pkgJson.peerDependencies || []);
  return [...dependencies, ...peerDependencies];
}
