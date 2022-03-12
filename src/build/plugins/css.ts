import { Plugin } from 'esbuild';
import { bundle as bundleCSS, BundleOptions, UrlDependency } from '@parcel/css';
import { createHash } from 'crypto';
import path from 'path';
import { BuildContext } from '../types';
import { resolveOutDir } from '../resolvers';

function camelize(str: string) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    if (+match === 0) return ''; // or if (/\s+/.test(match)) for white spaces
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function getAbsoluteUrl(resolveDir: string, url: string) {
  const pureUrl = url.replace(/"/g, '').replace(/'/g, '');
  if (path.isAbsolute(pureUrl) || pureUrl.startsWith('http')) {
    return pureUrl;
  }
  return path.resolve(resolveDir, pureUrl);
}

/**
 * The sourcemap created by `@parcel/css` needs some slight tweaking to be
 * consistent with sourcemaps created by ESBuild:
 *   - Resolve `sources` to the configured `outdir`
 *   - Convert `sources` to absolute paths.
 */
function patchSourcemap(map: Buffer, outdir: string) {
  const originalMap = JSON.parse(map.toString('utf-8'));
  const patchedMap = {
    ...originalMap,
    sources: [
      ...originalMap.sources.map((s: string) => {
        return path.relative(outdir, path.isAbsolute(s) ? s : `/${s}`);
      }),
    ],
  };

  return Buffer.from(JSON.stringify(patchedMap));
}

async function handleCSS(options: {
  filename: string;
  outdir: string;
  minify?: boolean;
  sourcemap?: boolean;
  cssModules?: boolean;
}) {
  const bundleOptions: BundleOptions = {
    filename: options.filename,
    minify: !!options.minify,
    sourceMap: !!options.sourcemap,
    cssModules: !!options.cssModules,
    analyzeDependencies: true,
    drafts: { nesting: true },
  };

  const { code, map, exports: cssModuleExports = {}, dependencies = [] } = bundleCSS(bundleOptions);

  let cssContent = code.toString('utf-8');

  const urls = dependencies.filter((d) => d.type === 'url') as UrlDependency[];
  const resolveDir = path.dirname(options.filename);
  urls.forEach(({ url, placeholder }) => {
    cssContent = cssContent.replace(new RegExp(`${placeholder}`, 'g'), getAbsoluteUrl(resolveDir, url));
  });

  const cssModulesJSON: Record<string, string> = {};
  if (options.cssModules) {
    Object.keys(cssModuleExports).forEach((originalClass) => {
      const className = cssModuleExports[originalClass].name;
      const classNameHash = createHash('md5').update(`${options.filename}:${className}`).digest('hex').slice(0, 8);
      cssModulesJSON[camelize(originalClass)] = classNameHash;
      cssContent = cssContent.replace(new RegExp(`\\.${className}`, 'g'), `.${classNameHash}`);
    });
  }

  const jsContent = options.cssModules ? `export default ${JSON.stringify(cssModulesJSON)};` : 'export default {}';

  if (map) {
    const patchedMap = patchSourcemap(map, options.outdir);
    cssContent += `\n/*# sourceMappingURL=data:application/json;base64,${patchedMap.toString('base64')} */`;
  }

  return {
    jsContent,
    cssContent,
  };
}

/**
 * Compiles/optimizes `*.css` files using `@parcel/css`.
 */
export function cssPlugin(ctx: BuildContext): Plugin {
  const cssRegex = /\.css$/;
  const cssModulesRegex = /\.modules?\.css$/;
  const extractNamespace = 'melodist.css-extract';
  const extractRegex = /\?melodist.css-extract$/;

  return {
    name: 'melodist:css',

    async setup(build) {
      const css = new Map<string, string>();

      // Compile/optimize CSS
      build.onLoad({ filter: cssRegex }, async (args) => {
        const { jsContent, cssContent } = await handleCSS({
          filename: args.path,
          outdir: await resolveOutDir(ctx),
          minify: !ctx.watch && ctx.minify,
          cssModules: cssModulesRegex.test(args.path),
          sourcemap: ctx.sourcemap,
        });

        css.set(args.path, cssContent);

        const jsFileContent = `import "${args.path}?${extractNamespace}";\n${jsContent}`;
        return {
          contents: jsFileContent,
          loader: 'js',
        };
      });

      // Extract CSS
      build.onResolve({ filter: extractRegex }, (args) => {
        return {
          path: args.path,
          namespace: extractNamespace,
        };
      });

      build.onLoad({ filter: extractRegex, namespace: extractNamespace }, (args) => {
        const cssContent = css.get(args.path.split('?')[0]);
        if (!cssContent) return null;
        return { contents: cssContent, loader: 'css' };
      });
    },
  };
}
