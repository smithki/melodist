import { Format, Platform } from 'esbuild';

export interface BuildContext {
  platform: Platform;
  external?: string[];
  format: Format;
  sourcemap?: boolean;
  srcdir: string;
  outdir: string;
  global: string[];
  define: Record<string, any>;
  name?: string;
  watch?: boolean;
  printMeta?: boolean;
  tsconfig: string;
  typecheck?: boolean;
}
