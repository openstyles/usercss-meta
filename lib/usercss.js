'use strict';

const {URL} = require('url');

const KNOWN_META = new Set([
  'author',
  'advanced',
  'description',
  'homepageURL',
  'icon',
  'license',
  'name',
  'namespace',
  // 'noframes',
  'preprocessor',
  'supportURL',
  'updateURL',
  'var',
  'version'
]);
const MANDATORY_META = ['name', 'namespace', 'version'];
const META_VARS = ['text', 'color', 'checkbox', 'select', 'dropdown', 'image'];

const RX_NUMBER = /-?\d+(\.\d+)?\s*/y;
const RX_WHITESPACE = /\s*/y;
const RX_WORD = /([\w-]+)\s*/y;
// Regex copied from https://github.com/sindresorhus/semver-regex
const RX_SEMVER = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/i;
const RX_STRING_BACKTICK = /(`(?:\\`|[\s\S])*?`)\s*/y;
const RX_STRING_QUOTED = /((['"])(?:\\\2|[^\n])*?\2|\w+)\s*/y;
const RX_URL = /url$/i;

const JSON_PRIME = {
  __proto__: null,
  'null': null,
  'true': true,
  'false': false
};

class ParseError extends Error {
  constructor(message, state = null) {
    super(message);
    this.state = state;
    this.index = state.index;
  }
}

function parseWord(state, error = 'invalid word') {
  RX_WORD.lastIndex = state.re.lastIndex;
  state.index = state.re.lastIndex;
  const match = RX_WORD.exec(state.text);
  if (!match) {
    throw new ParseError((state.errorPrefix || '') + error, state);
  }
  state.index = match.index;
  state.value = match[1];
  state.re.lastIndex += match[0].length;
}

function parseVar(state) {
  const result = {
    type: null,
    label: null,
    name: null,
    value: null,
    default: null,
    options: null
  };

  parseWord(state, 'missing type');
  result.type = state.type = state.value;

  if (!META_VARS.includes(state.type)) {
    throw new ParseError(`unknown type: ${state.type}`, state);
  }

  parseWord(state, 'missing name');
  result.name = state.value;

  parseString(state);
  result.label = state.value;

  switch (type === 'image' && state.key === 'var' ? '@image@var' : type) {
    case 'checkbox': {
      const match = text.slice(re.lastIndex).match(/([01])\s+/);
      if (!match) {
        throw new Error('value must be 0 or 1');
      }
      re.lastIndex += match[0].length;
      result.default = match[1];
      break;
    }

    case 'select':
    case '@image@var': {
      state.errorPrefix = 'Invalid JSON: ';
      parseJSONValue(state);
      state.errorPrefix = '';
      if (Array.isArray(state.value)) {
        result.options = state.value.map(text => createOption(text));
      } else {
        result.options = Object.keys(state.value).map(k => createOption(k, state.value[k]));
      }
      result.default = (result.options[0] || {}).name || '';
      break;
    }

    case 'dropdown':
    case 'image': {
      if (text[re.lastIndex] !== '{') {
        throw new Error('no open {');
      }
      result.options = [];
      re.lastIndex++;
      while (text[re.lastIndex] !== '}') {
        const option = {};

        parseStringUnquoted(state);
        option.name = state.value;

        parseString(state);
        option.label = state.value;

        if (type === 'dropdown') {
          parseEOT(state);
        } else {
          parseString(state);
        }
        option.value = state.value;

        result.options.push(option);
      }
      re.lastIndex++;
      eatWhitespace(state);
      result.default = result.options[0].name;
      break;
    }

    default: {
      // text, color
      parseStringToEnd(state);
      result.default = state.value;
    }
  }
  state.usercssData.vars[result.name] = result;
  validateVar(result);
}

function createOption(label, value) {
  let name;
  const match = label.match(/^(\w+):(.*)/);
  if (match) {
    ([, name, label] = match);
  }
  if (!name) {
    name = label;
  }
  if (!value) {
    value = name;
  }
  return {name, label, value};
}

function parseEOT(state) {
  const re = /<<<EOT([\s\S]+?)EOT;/y;
  re.lastIndex = state.re.lastIndex;
  const match = state.text.match(re);
  if (!match) {
    throw new Error('missing EOT');
  }
  state.re.lastIndex += match[0].length;
  state.value = match[1].trim().replace(/\*\\\//g, '*/');
  eatWhitespace(state);
}

function parseStringUnquoted(state) {
  const pos = state.re.lastIndex;
  const nextQuoteOrEOL = posOrEnd(state.text, '"', pos);
  state.re.lastIndex = nextQuoteOrEOL;
  state.value = state.text.slice(pos, nextQuoteOrEOL).trim().replace(/\s+/g, '-');
}

function parseString(state) {
  const pos = state.re.lastIndex;
  const rx = state.text[pos] === '`' ? RX_STRING_BACKTICK : RX_STRING_QUOTED;
  rx.lastIndex = pos;
  const match = rx.exec(state.text);
  if (!match) {
    throw new Error((state.errorPrefix || '') + 'Quoted string expected');
  }
  state.re.lastIndex += match[0].length;
  state.value = unquote(match[1]);
}

function parseJSONValue(state) {
  const {text, re, errorPrefix} = state;
  if (text[re.lastIndex] === '{') {
    // object
    const obj = {};
    re.lastIndex++;
    eatWhitespace(state);
    while (text[re.lastIndex] !== '}') {
      parseString(state);
      const key = state.value;
      if (text[re.lastIndex] !== ':') {
        throw new Error(`${errorPrefix}missing ':'`);
      }
      re.lastIndex++;
      eatWhitespace(state);
      parseJSONValue(state);
      obj[key] = state.value;
      if (text[re.lastIndex] === ',') {
        re.lastIndex++;
        eatWhitespace(state);
      } else if (text[re.lastIndex] !== '}') {
        throw new Error(`${errorPrefix}missing ',' or '}'`);
      }
    }
    re.lastIndex++;
    eatWhitespace(state);
    state.value = obj;
  } else if (text[re.lastIndex] === '[') {
    // array
    const arr = [];
    re.lastIndex++;
    eatWhitespace(state);
    while (text[re.lastIndex] !== ']') {
      parseJSONValue(state);
      arr.push(state.value);
      if (text[re.lastIndex] === ',') {
        re.lastIndex++;
        eatWhitespace(state);
      } else if (text[re.lastIndex] !== ']') {
        throw new Error(`${errorPrefix}missing ',' or ']'`);
      }
    }
    re.lastIndex++;
    eatWhitespace(state);
    state.value = arr;
  } else if (text[re.lastIndex] === '"' || text[re.lastIndex] === '`') {
    // string
    parseString(state);
  } else if (/\d/.test(text[re.lastIndex])) {
    // number
    parseNumber(state);
  } else {
    parseWord(state);
    if (!(state.value in JSON_PRIME)) {
      throw new Error(`${errorPrefix}unknown literal '${state.value}'`);
    }
    state.value = JSON_PRIME[state.value];
  }
}

function parseNumber(state) {
  RX_NUMBER.lastIndex = state.re.lastIndex;
  const match = RX_NUMBER.exec(state.text);
  if (!match) {
    throw new Error((state.errorPrefix || '') + 'invalid number');
  }
  state.value = Number(match[0].trim());
  state.re.lastIndex += match[0].length;
}

function eatWhitespace(state) {
  RX_WHITESPACE.lastIndex = state.re.lastIndex;
  state.re.lastIndex += RX_WHITESPACE.exec(state.text)[0].length;
}

function parseStringToEnd(state) {
  const EOL = posOrEnd(state.text, '\n', state.re.lastIndex);
  const match = state.text.slice(state.re.lastIndex, EOL);
  state.value = unquote(match.trim());
  state.re.lastIndex += match.length;
}

function unquote(s) {
  const q = s[0];
  if (q === s[s.length - 1] && (q === '"' || q === "'" || q === '`')) {
    // http://www.json.org/
    return s.slice(1, -1).replace(
      new RegExp(`\\\\([${q}\\\\/bfnrt]|u[0-9a-fA-F]{4})`, 'g'),
      s => {
        if (s[1] === q) {
          return q;
        }
        return JSON.parse(`"${s}"`);
      }
    );
  }
  return s;
}

function posOrEnd(haystack, needle, start) {
  const pos = haystack.indexOf(needle, start);
  return pos < 0 ? haystack.length : pos;
}

function createParser({
  unknownKey = "ignore"
}) {
  return {parse, validateVar};

  function parse(text) {
    if (text.includes('\r')) {
      throw TypeError('sourceCode includes invalid character: \'\\r\'');
    }

    const usercssData = {
      vars: {}
    };

    const re = /@(\w+)[ \t\xA0]*/mg;
    const state = {index: 0, re, text, usercssData};

    // parse
    let match;
    while ((match = re.exec(text))) {
      state.key = match[1];
      state.index = match.index;
      if (!KNOWN_META.has(state.key)) {
        if (unknownKey === 'ignore') {
          continue;
        } else if (unknownKey === 'assign') {
          // pass
        } else if (unknownKey === 'throw') {
          throw new ParseError(`Unknown metadata @${state.key}`, state);
        } else {
          throw new TypeError("unknownKey must be 'ignore', 'assign', or 'throw'");
        }
      }
      if (key === 'var' || key === 'advanced') {
        if (key === 'advanced') {
          state.maybeUSO = true;
        }
        parseVar(state);

      } else if (state.key === 'version') {
        parseStringToEnd(state);
        if (RX_SEMVER.test(state.value)) {
          throw ParseError(`${state.value} is not a valid version`, state);
        }
        state.value = normalizeVersion(state.value);

      } else if (RX_URL.test(state.key)) {
        parseStringToEnd(state);
        const url = new URL(state.value);
        if (!/^https?:/.test(url.protocol)) {
          throw new ParseError(`${url.protocol} is not a valid protocol`, state);
        }

      } else {
        parseStringToEnd(state);
      }
      usercssData[key] = state.value;
    }

    if (state.maybeUSO && !usercssData.preprocessor) {
      usercssData.preprocessor = 'uso';
    }

    for (const prop of MANDATORY_META) {
      if (!usercssData[prop]) {
        throw new Error(`Missing metadata @${prop}`);
      }
    }

    if (usercssData.version && !RX_SEMVER.test(usercssData.version)) {
      throw new TypeError(`Invalid Version: ${usercssData.version}`);
    }
    // validateStyle(style);
    return usercssData;
  }
}

function normalizeVersion(version) {
  // https://docs.npmjs.com/misc/semver#versions
  if (version[0] === 'v' || version[0] === '=') {
    return version.slice(1);
  }
  return version;
}

// this function needs to be exported
function validateVar(va, value = 'default') {
  if (va.type === 'select' || va.type === 'dropdown') {
    if (va.options.every(o => o.name !== va[value])) {
      throw new Error('Invalid @select: value doesn\'t exist in the list');
    }
  } else if (va.type === 'checkbox' && !/^[01]$/.test(va[value])) {
    throw new Error('Invalid @var checkbox: value must be 0 or 1');
  } else if (va.type === 'color') {
    va[value] = colorConverter.format(colorConverter.parse(va[value]), 'rgb');
  }
}

module.exports = {createParser};
