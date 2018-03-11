import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';

const {UGLIFY} = process.env;
const plugins = [commonjs()];

if (UGLIFY) {
  plugins.push(uglify());
}

export default {
  input: 'bundle.js',
  output: {
    file: `dist/usercss-meta${UGLIFY ? '.min' : ''}.js`,
    format: 'iife',
    name: 'usercssMeta',
    globals: {
      url: 'window'
    }
  },
  plugins
};
