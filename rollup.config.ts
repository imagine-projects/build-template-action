// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import { builtinModules } from 'module'

// Only exclude Node.js builtins - bundle everything else
const external = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`)
]

const config = {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.cjs',
    format: 'cjs',
    sourcemap: true,
    inlineDynamicImports: true
  },
  external,
  plugins: [
    typescript(),
    json(),
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ['node']
    }),
    commonjs({
      ignoreDynamicRequires: true
    })
  ]
}

export default config
