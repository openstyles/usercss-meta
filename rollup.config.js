import cjs from 'rollup-plugin-cjs-es';
import uglify from 'rollup-plugin-uglify';
import resolve from 'rollup-plugin-node-resolve';

const {UGLIFY} = process.env;

export default {
  input: 'index.js',
  output: {
    file: `dist/usercss-meta${UGLIFY ? '.min' : ''}.js`,
    format: 'iife',
    name: 'usercssMeta',
    freeze: false,
    legacy: true,
    sourcemap: true
  },
  plugins: [
    resolve({
      browser: true
    }),
    cjs(),
    UGLIFY && uglify()
  ].filter(Boolean)
};
