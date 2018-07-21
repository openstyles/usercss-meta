function createStringifier({
  alignKeys = false,
  space = 2,
  format = 'stylus',
  stringifyKey: userStringifyKey = {},
  stringifyVar: userStringifyVar = {}
} = {}) {
  function stringify(meta) {
    let varKey;
    if (format === 'stylus') {
      varKey = 'var';
    } else if (format === 'xstyle') {
      varKey = 'advanced';
    } else {
      throw new TypeError("options.format must be 'stylus' or 'xstyle'");
    }
    const lines = [];
    for (const [key, value] of Object.entries(meta)) {
      if (Object.prototype.hasOwnProperty.call(userStringifyKey, key)) {
        const result = userStringifyKey[key](value);
        if (Array.isArray(result)) {
          lines.push(...result.map(v => [key, v]));
        } else {
          lines.push([key, result]);
        }
      } else if (key === 'vars') {
        for (const va of Object.values(value)) {
          lines.push([varKey, stringifyVar(va, format, userStringifyVar, space)]);
        }
      } else if (Array.isArray(value)) {
        for (const subLine of value) {
          lines.push([key, quoteIfNeeded(subLine)]);
        }
      } else {
        lines.push([key, quoteIfNeeded(value)]);
      }
    }
    const maxKeyLength = alignKeys ? Math.max(...lines.map(l => l[0].length)) : 0;
    return `/* ==UserStyle==\n${
      escapeComment(lines.map(([key, text]) => `@${key.padEnd(maxKeyLength)} ${text}`).join('\n'))
    }\n==/UserStyle== */`;
  }

  return {stringify};
}

function stringifyVar(va, format, userStringifyVar, space) {
  return `${va.type} ${va.name} ${JSON.stringify(va.label)} ${vaDefault()}`;

  function vaDefault() {
    if (Object.prototype.hasOwnProperty.call(userStringifyVar, va.type)) {
      return userStringifyVar[va.type](va, format, space);
    }
    if (va.options) {
      if (format === 'stylus') {
        return JSON.stringify(va.options.reduce((obj, opt) => {
          obj[`${opt.name}:${opt.label}`] = opt.value;
          return obj;
        }, {}), null, space);
      }
      return stringifyEOT(va.options, va.type === 'image', space);
    }
    if (va.type === 'text' && format === 'xstyle') {
      return JSON.stringify(va.default);
    }
    return va.default;
  }
}

function quoteIfNeeded(text) {
  if (typeof text === 'number') {
    text = text.toString();
  }
  if (Array.isArray(text)) {
    return JSON.stringify(text);
  }
  if (text.includes('\n')) {
    return JSON.stringify(text);
  }
  return text;
}

function escapeComment(text) {
  return text.replace(/\*\//g, '*\\/');
}

function stringifyEOT(options, singleLine = false, space = 0) {
  const pad = typeof space === 'string' ? space : ' '.repeat(space);
  return `{\n${options.map(
    o => `${pad}${o.name} ${JSON.stringify(o.label)} ${oValue(o.value)}`
  ).join('\n')}\n}`;

  function oValue(value) {
    if (singleLine) {
      return JSON.stringify(value);
    }
    return `<<<EOT\n${value} EOT;`;
  }
}

module.exports = {
  stringify(meta, options) {
    return createStringifier(options).stringify(meta);
  },
  createStringifier
};
