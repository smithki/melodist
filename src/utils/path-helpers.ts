import path from 'path';
import { REPO_ROOT } from '../constants';

/**
 * Resolve an absolute path relative to the repository root.
 */
export function resolveToRoot(...pathSegments: string[]) {
  return path.resolve(REPO_ROOT, ...pathSegments);
}

/**
 * Resolve an absolute path relative to the output directory.
 */
export function resolveToDist(...pathSegments: string[]) {
  return path.resolve(REPO_ROOT, 'dist', ...pathSegments);
}
