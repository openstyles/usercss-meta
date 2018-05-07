import cjs from 'rollup-plugin-cjs-es';
import uglify from 'rollup-plugin-uglify';
import shim from 'rollup-plugin-shim';

const {UGLIFY} = process.env;
const plugins = [
  shim({
    url: 'export const URL = self.URL;'
  }),
  cjs()
];

if (UGLIFY) {
  plugins.push(uglify());
}

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
  plugins
};
