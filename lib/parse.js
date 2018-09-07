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

const RX_CHECKBOX = /([01])\s+/y;
const RX_EOT = /<<<EOT([\s\S]+?)EOT;/y;
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
  constructor(err) {
    super(err.message);
    delete err.message;
    this.name = 'ParseError';
    Object.assign(this, err);
  }
}

class MissingCharError extends ParseError {
  constructor(chars, index) {
    super({
      code: 'missingChar',
      args: chars,
      message: `Missing character: ${chars.map(c => `'${c}'`).join(', ')}`,
      index
    });
  }
}

function parseWord(state) {
  const pos = state.lastIndex;
  RX_WORD.lastIndex = pos;
  const match = RX_WORD.exec(state.text);
  if (!match) {
    throw new ParseError({
      code: 'invalidWord',
      message: 'Invalid word',
      index: pos
    });
  }
  state.index = pos;
  state.value = match[1];
  state.lastIndex += match[0].length;
}

function parseVarCheckbox(state) {
  const pos = state.lastIndex;
  RX_CHECKBOX.lastIndex = pos;
  const match = state.text.match(RX_CHECKBOX);
  if (!match) {
    throw new ParseError({
      code: 'invalidCheckboxDefault',
      message: 'value must be 0 or 1',
      index: pos
    });
  }
  state.index = pos;
  state.value = match[1];
  state.lastIndex += match[0].length;
}

function parseJSON(state) {
  const pos = state.lastIndex;
  try {
    parseJSONValue(state);
  } catch (err) {
    err.message = `Invalid JSON: ${err.message}`;
    throw err;
  }
  state.index = pos;
}

function parseVarSelect(state) {
  parseJSON(state);
  if (Array.isArray(state.value)) {
    state.varResult.options = state.value.map(text => createOption(text));
  } else {
    state.varResult.options = Object.keys(state.value).map(k => createOption(k, state.value[k]));
  }
  if (state.varResult.options.length === 0) {
    throw new ParseError({
      code: 'invalidSelectEmptyOptions',
      message: 'Option list is empty',
      index: state.index
    });
  }
  state.value = state.varResult.options[0].name;
}

function parseVarXStyle(state) {
  const pos = state.lastIndex;
  if (state.text[state.lastIndex] !== '{') {
    throw new MissingCharError(['{'], pos);
  }
  state.varResult.options = [];
  state.lastIndex++;
  while (state.text[state.lastIndex] !== '}') {
    const option = {};

    parseStringUnquoted(state);
    option.name = state.value;

    parseString(state);
    option.label = state.value;

    if (state.type === 'dropdown') {
      parseEOT(state);
    } else {
      parseString(state);
    }
    option.value = state.value;

    state.varResult.options.push(option);
  }
  state.lastIndex++;
  eatWhitespace(state);
  if (state.varResult.options.length === 0) {
    throw new ParseError({
      code: 'invalidSelectEmptyOptions',
      message: 'Option list is empty',
      index: pos
    });
  }
  state.value = state.varResult.options[0].name;
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
  const pos = state.lastIndex;
  RX_EOT.lastIndex = pos;
  const match = state.text.match(RX_EOT);
  if (!match) {
    throw new ParseError({
      code: 'missingEOT',
      message: 'Missing EOT',
      index: pos
    });
  }
  state.index = pos;
  state.lastIndex += match[0].length;
  state.value = match[1].trim().replace(/\*\\\//g, '*/');
  eatWhitespace(state);
}

function parseStringUnquoted(state) {
  const pos = state.lastIndex;
  const nextQuoteOrEOL = posOrEnd(state.text, '"', pos);
  state.index = pos;
  state.lastIndex = nextQuoteOrEOL;
  state.value = state.text.slice(pos, nextQuoteOrEOL).trim().replace(/\s+/g, '-');
}

function parseString(state) {
  const pos = state.lastIndex;
  const rx = state.text[pos] === '`' ? RX_STRING_BACKTICK : RX_STRING_QUOTED;
  rx.lastIndex = pos;
  const match = rx.exec(state.text);
  if (!match) {
    throw new ParseError({
      code: 'invalidString',
      message: 'Invalid string',
      index: pos
    });
  }
  state.index = pos;
  state.lastIndex += match[0].length;
  state.value = unquote(match[1]);
}

function parseJSONValue(state) {
  const {text} = state;
  if (text[state.lastIndex] === '{') {
    // object
    const obj = {};
    state.lastIndex++;
    eatWhitespace(state);
    while (text[state.lastIndex] !== '}') {
      parseString(state);
      const key = state.value;
      if (text[state.lastIndex] !== ':') {
        throw new MissingCharError([':'], state.lastIndex);
      }
      state.lastIndex++;
      eatWhitespace(state);
      parseJSONValue(state);
      obj[key] = state.value;
      if (text[state.lastIndex] === ',') {
        state.lastIndex++;
        eatWhitespace(state);
      } else if (text[state.lastIndex] !== '}') {
        throw new MissingCharError([',', '}'], state.lastIndex);
      }
    }
    state.lastIndex++;
    eatWhitespace(state);
    state.value = obj;
  } else if (text[state.lastIndex] === '[') {
    // array
    const arr = [];
    state.lastIndex++;
    eatWhitespace(state);
    while (text[state.lastIndex] !== ']') {
      parseJSONValue(state);
      arr.push(state.value);
      if (text[state.lastIndex] === ',') {
        state.lastIndex++;
        eatWhitespace(state);
      } else if (text[state.lastIndex] !== ']') {
        throw new MissingCharError([',', ']'], state.lastIndex);
      }
    }
    state.lastIndex++;
    eatWhitespace(state);
    state.value = arr;
  } else if (text[state.lastIndex] === '"' || text[state.lastIndex] === "'" || text[state.lastIndex] === '`') {
    // string
    parseString(state);
  } else if (/\d/.test(text[state.lastIndex])) {
    // number
    parseNumber(state);
  } else {
    parseWord(state);
    if (!(state.value in JSON_PRIME)) {
      throw new ParseError({
        code: 'unknownJSONLiteral',
        args: [state.value],
        message: `Unknown literal '${state.value}'`,
        index: state.index
      });
    }
    state.value = JSON_PRIME[state.value];
  }
}

function parseNumber(state) {
  const pos = state.lastIndex;
  RX_NUMBER.lastIndex = pos;
  const match = RX_NUMBER.exec(state.text);
  if (!match) {
    throw new ParseError({
      code: 'invalidNumber',
      message: 'Invalid number',
      index: pos
    });
  }
  state.index = pos;
  state.value = Number(match[0].trim());
  state.lastIndex += match[0].length;
}

function eatWhitespace(state) {
  RX_WHITESPACE.lastIndex = state.lastIndex;
  state.lastIndex += RX_WHITESPACE.exec(state.text)[0].length;
}

function parseStringToEnd(state) {
  const EOL = posOrEnd(state.text, '\n', state.lastIndex);
  const match = state.text.slice(state.lastIndex, EOL);
  state.index = state.lastIndex;
  state.value = unquote(match.trim());
  state.lastIndex += match.length;
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

function collectErrors(fn, errors) {
  if (errors) {
    try {
      fn();
    } catch (err) {
      errors.push(err);
    }
  } else {
    fn();
  }
}

function posOrEnd(haystack, needle, start) {
  const pos = haystack.indexOf(needle, start);
  return pos < 0 ? haystack.length : pos;
}

function createParser({
  unknownKey = 'ignore',
  mandatoryKeys = MANDATORY_META,
  parseKey: userParseKey = {},
  parseVar: userParseVar = {},
  allowErrors = false
} = {}) {
  const knownKeys = new Set([...KNOWN_META, ...Object.keys(userParseKey)]);
  const knownVars = new Set([...META_VARS, ...Object.keys(userParseVar)]);

  return {parse};

  function parseVar(state) {
    const result = {
      type: null,
      label: null,
      name: null,
      value: null,
      default: null,
      options: null
    };
    state.varResult = result;

    parseWord(state);
    state.type = state.value;
    result.type = state.type;

    if (!knownVars.has(state.type)) {
      throw new ParseError({
        code: 'unknownVarType',
        message: `Unknown @var type: ${state.type}`,
        args: [state.type],
        index: state.index
      });
    }

    parseWord(state);
    result.name = state.value;

    parseString(state);
    result.label = state.value;

    if (userParseVar[state.type]) {
      userParseVar[state.type](state);
    } else if (state.type === 'checkbox') {
      parseVarCheckbox(state);
    } else if (state.type === 'select' || state.type === 'image' && state.key === 'var') {
      parseVarSelect(state);
    } else if (state.type === 'dropdown' || state.type === 'image') {
      parseVarXStyle(state);
    } else {
      // color, text
      parseStringToEnd(state);
    }
    result.default = state.value;
    if (!state.usercssData.vars) {
      state.usercssData.vars = {};
    }
    state.usercssData.vars[result.name] = result;
  }

  function parse(text) {
    if (text.includes('\r')) {
      throw new TypeError("metadata includes invalid character: '\\r'");
    }

    const usercssData = {};
    const errors = [];

    const re = /@(\w+)[^\S\r\n]*/mg;
    const state = {
      index: 0,
      lastIndex: 0,
      text,
      usercssData,
      warn: err => errors.push(err)
    };

    // parse
    let match;
    while ((match = re.exec(text))) {
      state.index = match.index;
      state.lastIndex = re.lastIndex;
      state.key = match[1];
      state.shouldIgnore = false;

      collectErrors(() => {
        try {
          parseKey(state);
        } catch (err) {
          if (err.index === undefined) {
            err.index = state.index;
          }
          throw err;
        }
        if (state.key !== 'var' && !state.shouldIgnore) {
          usercssData[state.key] = state.value;
        }
      }, allowErrors && errors);

      re.lastIndex = state.lastIndex;
    }

    if (state.maybeUSO && !usercssData.preprocessor) {
      usercssData.preprocessor = 'uso';
    }

    collectErrors(() => {
      const missing = mandatoryKeys.filter(k => !Object.prototype.hasOwnProperty.call(usercssData, k));
      if (missing.length > 0) {
        throw new ParseError({
          code: 'missingMandatory',
          args: missing,
          message: `Missing metadata: ${missing.map(k => `@${k}`).join(', ')}`
        });
      }
    }, allowErrors && errors);

    return {
      metadata: usercssData,
      errors
    };
  }

  function parseKey(state) {
    if (!knownKeys.has(state.key)) {
      if (unknownKey === 'ignore') {
        state.shouldIgnore = true;
        return;
      }
      if (unknownKey === 'assign') {
        // pass
      } else if (unknownKey === 'throw') {
        throw new ParseError({
          code: 'unknownMeta',
          args: [state.key],
          message: `Unknown metadata: @${state.key}`,
          index: state.index
        });
      } else {
        throw new TypeError("unknownKey must be 'ignore', 'assign', or 'throw'");
      }
    }
    if (userParseKey[state.key]) {
      userParseKey[state.key](state);

    } else if (state.key === 'var' || state.key === 'advanced') {
      if (state.key === 'advanced') {
        state.maybeUSO = true;
      }
      parseVar(state);

    } else if (state.key === 'version') {
      parseStringToEnd(state);
      if (!RX_SEMVER.test(state.value)) {
        throw new ParseError({
          code: 'invalidVersion',
          args: [state.value],
          message: `Invalid version: ${state.value}`,
          index: state.index
        });
      }
      state.value = normalizeVersion(state.value);

    } else if (RX_URL.test(state.key)) {
      parseStringToEnd(state);
      let url;
      try {
        url = new URL(state.value);
      } catch (err) {
        err.args = [state.value];
        err.index = state.index;
        throw err;
      }
      if (!/^https?:/.test(url.protocol)) {
        throw new ParseError({
          code: 'invalidURLProtocol',
          args: [url.protocol],
          message: `Invalid protocol: ${url.protocol}`,
          index: state.index
        });
      }

    } else {
      parseStringToEnd(state);
    }
  }
}

function normalizeVersion(version) {
  // https://docs.npmjs.com/misc/semver#versions
  if (version[0] === 'v' || version[0] === '=') {
    return version.slice(1);
  }
  return version;
}

module.exports = {
  parse(text, options) {
    return createParser(options).parse(text);
  },
  createParser,
  ParseError,
  util: {
    parseWord, parseJSON, parseEOT, parseString, parseNumber, eatWhitespace,
    parseStringToEnd, unquote
  }
};
