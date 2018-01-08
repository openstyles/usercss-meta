const merge = require('deepmerge');
const {getInputVars, getOutputVars, template, output} = require('./helpers');

const vars = {
  color: {
    fontColor: {prefix: '@var', type: 'color', name: 'font-color', label: 'Font-color', value: '#123456'}
  },
  color2: {
    fontColor: {prefix: '@advanced', type: 'color', name: 'font-color', label: 'Font-color', value: '#123456'}
  },
  select: {
    navPos: {prefix: '@var', type: 'select', name: 'nav-pos', label: 'Navbar pos', value: {
      Top: 'top', Bottom: 'bottom', Right: 'right', Left: 'left'}}
  },
  select2: {
    bkgd: {prefix: '@var', type: 'select', name: 'bkgd', label: 'bkgd color', value: {'near_black:Near Black': '#111111', 'near_white:Near White': '#eeeeee'}}
  },
  select3: {
    theme: {prefix: '@var', type: 'select', name: 'theme', label: 'Theme', value: ['dark', 'light']}
  },
  select4: {
    theme: {prefix: '@var', type: 'select', name: 'theme', label: 'Theme', value: ['dark:Dark theme', 'light:Light theme']}
  },
  checkbox: {
    affix: {prefix: '@var', type: 'checkbox', name: 'affix', label: 'Set affixed', value: '1'}
  },
  input: {
    height: {prefix: '@advanced', type: 'text', name: 'height', label: 'Set height', value: '10px'}
  },
  image: {
    img: {prefix: '@advanced', type: 'image', name: 'bkgd', label: 'Page bkgd',
      xstyle: `{
  bg_1 "Background 1" "http://example.com/example.jpg"
  bg_2 "Background 2" "http://example.com/photo.php?id=_A_IMAGE_ID_"
}`
    }
  },
  dropdown: {
    adv: {prefix: '@advanced', type: 'dropdown', name: 'a_bkgd', label: 'browser',
      xstyle: `{
  fx "Firefox" <<<EOT
background-color: red; EOT;
  cr "Chrome" <<<EOT
background-color: green; EOT;
}`}
  }
};

module.exports = [{
  info: 'Default template',
  input: template({}),
  output: output({})
}, {
  info: 'Empty @name',
  input: template({n: ' '}),
  error: 'Missing metadata @name'
}, {
  info: 'Empty @namespace',
  input: template({ns: ' '}),
  error: 'Missing metadata @namespace'
}, {
  info: 'Missing version',
  input: template({v: ' '}),
  error: 'Invalid Version: '
}, {
  info: 'Invalid version',
  input: template({v: '1.0.x'}),
  error: 'Invalid Version: 1.0.x'
}, {
  info: 'Test author with meta',
  input: template({a: 'Fred <fred@fred-mail.com> (fred-site.com)'}),
  output: output({a: 'Fred <fred@fred-mail.com> (fred-site.com)'})
}, {
  info: 'basic @var color',
  input: getInputVars(vars.color),
  output: getOutputVars(vars.color)
}, {
  info: 'basic @advanced color',
  input: getInputVars(vars.color2),
  output: getOutputVars(vars.color2)
}, {
  info: 'basic @var select',
  input: getInputVars(vars.select),
  output: getOutputVars(vars.select)
}, {
  info: 'basic @var select with build-in label',
  input: getInputVars(vars.select2),
  output: getOutputVars(vars.select2)
}, {
  info: 'basic @var select set as an array',
  input: getInputVars(vars.select3),
  output: getOutputVars(vars.select3)
}, {
  info: 'basic @var select set as an array with built-in label',
  input: getInputVars(vars.select4),
  output: getOutputVars(vars.select4)
}, {
  info: 'basic @var checkbox',
  input: getInputVars(vars.checkbox),
  output: getOutputVars(vars.checkbox)
}, {
  info: 'basic @advanced input',
  input: getInputVars(vars.input),
  output: getOutputVars(vars.input)
}, {
  info: 'basic @advanced image',
  input: getInputVars(vars.image),
  output: merge(getOutputVars(vars.image), {
    usercssData: {
      vars: {
        bkgd: {
          default: 'bg_1',
          options: [
            {name: 'bg_1', label: 'Background 1', value: 'http://example.com/example.jpg'},
            {name: 'bg_2', label: 'Background 2', value: 'http://example.com/photo.php?id=_A_IMAGE_ID_'}
          ]
        }
      }
    }
  })
}, {
  info: 'xStyle @advanced dropdown',
  input: getInputVars(vars.dropdown),
  output: merge(getOutputVars(vars.dropdown), {
    usercssData: {
      vars: {
        'a_bkgd': {
          default: 'fx',
          options: [
            {name: 'fx', label: 'Firefox', value: 'background-color: red;'},
            {name: 'cr', label: 'Chrome', value: 'background-color: green;'}
          ]
        }
      }
    }
  })
}];
