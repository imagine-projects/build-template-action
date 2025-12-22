// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

const config = {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.cjs',
    format: 'cjs',
    sourcemap: true,
    inlineDynamicImports: true
  },
  plugins: [
    typescript(),
    json(),
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ['node'],
      // Bundle all dependencies
      resolveOnly: [/^(?!node:)/]
    }),
    commonjs({
      ignoreDynamicRequires: true
    })
  ]
}

export default config
