import { Format, Platform } from 'esbuild';

export interface MelodistContext {
  platform: Platform;
  external?: string[];
  format: Format;
  esTarget?: string;
  sourcemap?: boolean;
  srcdir: string;
  outdir: string;
  global: string[];
  define: Record<string, any>;
  name?: string;
  watch?: boolean;
  tsconfig: string;
  typecheck?: boolean;
  minify: boolean;
  mainFields?: string[];
  css?: boolean;
}

export interface DisposeFunction {
  (): Promise<void>;
}
