import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const production = process.env.NODE_ENV === 'production';

export default [
  {
    input: 'src/core/app.js',
    output: {
      file: 'public/js/app.bundle.js',
      format: 'es',
      sourcemap: !production
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**'
      }),
      production && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        format: {
          comments: false
        }
      })
    ].filter(Boolean),
    watch: {
      exclude: 'node_modules/**'
    }
  },
  {
    input: [
      'src/tools/image/compress.js',
      'src/tools/image/resize.js',
      'src/tools/image/crop.js',
      'src/tools/image/editor.js',
      'src/tools/image/upscale.js',
      'src/tools/image/background-remove.js',
      'src/tools/image/watermark.js',
      'src/tools/image/rotate.js'
    ],
    output: {
      dir: 'public/js/tools',
      format: 'es',
      sourcemap: !production
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**'
      }),
      production && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        format: {
          comments: false
        }
      })
    ].filter(Boolean)
  }
];