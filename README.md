# 📦 `melodist`

> An opinionated bundler for creating TypeScript libraries.

## 🔗 Installation

With NPM:

```zsh
npm install -D melodist
```

With Yarn:

```zsh
yarn add -D melodist
```

## 📖 Documentation

### Making sense of `melodist` outputs

`melodist` works in tandem with [ESBuild](https://esbuild.github.io/) and [TypeScript](https://www.typescriptlang.org/) to generate production-ready code bundles that are publishable to NPM, along with TypeScript definition files to support strongly-typed integrations by default.

A typical output looks like this:

```
your_project/
└── .melodist/
    │
    │   # CommonJS modules (with --format=cjs)
    ├── cjs/
    │   ├── index.js
    │   ├── index.js.map
    │   ├── [index.css]
    │   └── [index.css.map]
    │
    │   # ES modules (with --format=esm)
    ├── esm/
    │   ├── index.js
    │   ├── index.js.map
    │   ├── index.mjs
    │   ├── index.mjs.map
    │   ├── [index.css]
    │   └── [index.css.map]
    │
    │   # Immediately-invoked function expression (with --format=iife)
    ├── iife/
    │   ├── index.js
    │   ├── index.js.map
    │   ├── [index.css]
    │   └── [index.css.map]
    │
    │   # React Native modules (with --format=rn)
    ├── rn/
    │   ├── index.js
    │   └── index.js.map
    │
    │   # TypeScript definitions
    └── types/
        └── *.d.ts
```

`melodist` generates multiple outputs in order to maximize backwards compatibility and interoperability across JS runtimes. These outputs can be associated with entrypoints configured in `package.json`:

```js
{
  // CommonJS output
  "main": ".melodist/cjs/index.js",

  // ES modules output (legacy)
  "module": ".melodist/esm/index.js",

  // TypeScript definition
  "types": ".melodist/types/index.d.ts",

  // React Native output
  "react-native": ".melodist/rn/index.js",

  // CDN entrypoint
  "jsdelivr": ".melodist/iife/index.js",

  // You can also define a standard NodeJS
  // "exports" field, for maximum compatibility
  "exports": {
    // ES modules output (using `.mjs` extension)
    "import": "./dist/esm/index.mjs",
    // CommonJS output (for redundancy)
    // (this should be in-sync with package.json#main)
    "require": "./dist/cjs/index.js"
  }
}
```

### Entrypoints

By default, `[srcdir]/index.{ts,tsx}` and/or `[srcdir]/index.css` is resolved as a starting point for bundling. However, each delivery format (**CommonJS modules**, **ES modules**, **IIFE modules**, and **React Native**) can define its own entrypoint using a filename identifier.

- **CommonJS**: `index.cjs.{ts,tsx,css}`
- **ES**: `index.esm.{ts,tsx,css}`
- **IIFE**: `index.iife.{ts,tsx,css}`
- **React Native**: `index.rn.{ts,tsx,css}`

### Defining external dependencies

By default, `"dependencies"` and `"peerDependencies"` listed in `package.json` are marked "external" — meaning those dependencies won't be included in the bundle, only referenced by the relevant module system (`import` or `require`). These defaults can be extended through the use of `--external` flags.

For **IIFE** bundles, externals can be defined separately using `--external:iife` flags, falling back to `"dependencies"`, `"peerDependencies"` and `--external` where necessary.

### Defining global Dependencies

Global dependencies can defined through the use of `--global` flags. Dependencies marked as global are compiled to a variable reference on a global object. This is handy for situations where external dependencies may be included via `<script>` tags in a browser.

For **IIFE** bundles, globals can be defined separately using `--global:iife` flags, falling back to `--global` where necessary.

### Commands

#### `melodist build` / `melodist dev`

`melodist build` creates an optimized, production-ready bundle.

`melodist dev` serves a hot-reloading development server.

Both commands accept the same arguments and flags:

```
USAGE

$ melodist <build|dev> [options] [<srcdir>]

ARGUMENTS

srcdir   Directory where input shall be consumed from. Default: "./src"

OPTIONS

--outdir, -o       Directory where output shall be placed. Default: ".melodist"

--format, -f       A list of output formats that should be produced. Default:
                   ["cjs", "esm"]

--es-target        The EcmaScript syntax version to compile to. Default: "esnext"

--platform, -p     Target platform (one of: browser, node, neutral). Default:
                   "neutral"

--external, -e     Dependencies to be externalized. Default: inferred from
                   `dependencies` and `peerDependencies`

--external:iife,   Dependencies to be externalized if --format=iife is in use.
-e:iife            Default: falls back to --external

--global, -g       Dependencies transpiled to global variables (i.e.: --global
                   react=React).

--global:iife,     Dependencies transpiled to global variables if --format=iife
-g:iife            is in use (i.e.: --global:iife react=React). Default: falls
                   back to --global

--name             A global variable name to use if --format=iife is in use.

--(no-)sourcemap   Generate sourcemaps. Default: true

--env              ENV file from which to load environment data. Default: ".env"

--tsconfig         TSConfig file from which to load TypeScript configuration.
                   Default: "tsconfig.json"

--(no-)typecheck   Whether to validate TypeScript typings at build time. Default:
                   true

--(no-)minify      Whether to optimize bundles through code minification. Default:
                   true

--help, -h         Show help text (you're lookin' at it).

--version, -v      Show current version.
```
