import { defineConfig } from 'tsdown'

/**
 * Browser client bundle for the dsh web GUI.
 *
 * Produces the exact module-table artifact the loader expects:
 *   window.__ModuleLoader__.load({ id, factory: (require) => { ... } })
 * with react / jsx-runtime / primitives resolved through the injected require
 * (platform externals), and everything else inlined.
 */
const ID = 'dsh-client-ui-explorer'

/** Resolved from the loader module table at runtime — never bundled. */
const EXTERNALS = ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives']

export default defineConfig({
  name: ID + '/client',
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  // virtual-core ships unguarded `process.env.NODE_ENV` checks; the browser
  // has no `process`, so bake production in at build time.
  define: { 'process.env.NODE_ENV': '"production"' },
  // oxc minify: strip comments, mangle names, compress lines
  minify: true,
  dts: false,
  clean: false,
  sourcemap: true,
  deps: { neverBundle: EXTERNALS },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: ' + JSON.stringify(ID) + ', factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
