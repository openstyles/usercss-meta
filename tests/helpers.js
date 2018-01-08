const {color} = require('../index');

const defaults = {
  n: 'test',
  ns: 'github.com/openstyles/stylus',
  v: '0.1.0',
  d: 'my userstyle',
  a: 'Me'
};

function processAdv(val, xstyle) {
  if (xstyle) {
    return xstyle;
  }
  return typeof val === 'string' ? val : JSON.stringify(val, null, 2);
}

function outputVars(obj) {
  const type = typeof obj;
  if (type === 'undefined') {
    return '';
  }
  /* @advanced dropdown a_background "Your browser" {
fx "Firefox" <<<EOT
background-color: red; EOT;
cr "Chrome" <<<EOT
background-color: green; EOT;
} */
  return type === 'string' ?
    obj :
    Object.keys(obj).map(key => {
      const {prefix, type, name, label, value, xstyle} = obj[key];
      return `${prefix} ${type} ${name} '${label}' ${processAdv(value, xstyle)}`;
    }).join('\n');
}

function getParts(value) {
  return value.indexOf(':') > -1 ? value.split(':') : [value, value];
}

function getOptions(options) {
  const isArray = Array.isArray(options);
  return Object.keys(options).map(key => {
    const parts = getParts(isArray ? options[key] : key);
    const value = getParts(options[key])[0];
    return {name: parts[0], label: parts[1], value};
  });
}

function processVars(vars) {
  const settings = {};
  if (typeof vars === 'undefined') return {};
  Object.keys(vars).forEach(v => {
    const {type, name, label, value} = vars[v];
    let deflt = '';
    switch (typeof value) {
      case 'string':
        deflt = type === 'color' ?
          color.format(color.parse(value), 'rgb') :
          value;
        break;
      case 'object':
        deflt = Array.isArray(value) ?
          getParts(value[0])[0] :
          getParts(Object.keys(value)[0])[0];
        break;
      default:
        deflt = '';
    }
    settings[name] = {
      default: deflt,
      label,
      name,
      type,
      value: null,
      options: type === 'select' ? getOptions(value) : null
    };
  });
  return settings;
}

function getInputVars(vars) {
  return template({vars: outputVars(vars)});
}

function getOutputVars(vars) {
  return output({
    sourceCode: getInputVars(vars),
    vars: processVars(vars)
  });
}

function template(args) {
  const {n, ns, v, d, a} = args;
  return `/* ==UserStyle==
@name        ${n || defaults.n}
@namespace   ${ns || defaults.ns}
@version     ${v || defaults.v}
@description ${d || defaults.d}
@author      ${a || defaults.a}
${outputVars(args.vars)}
==/UserStyle== */
@-moz-document domain("example.com") {
 /* */
}`;
}

function output(args) {
  const {n, ns, v, d, a, vars = {}, sourceCode = template(args)} = args;
  const result = {
    author: a || defaults.a,
    description: d || defaults.d,
    enabled: true,
    name: n || defaults.n,
    reason: 'install',
    sections: [], // not parsed by this module (only in Stylus)
    sourceCode,
    usercssData: {
      author: a || defaults.a,
      description: d || defaults.d,
      name: n || defaults.n,
      namespace: ns || defaults.ns,
      version: v || defaults.v,
      vars
    }
  };
  if (/@advanced/.test(result.sourceCode)) {
    result.usercssData.preprocessor = 'uso';
  }
  return result;
}

module.exports = {getInputVars, getOutputVars, template, output};
