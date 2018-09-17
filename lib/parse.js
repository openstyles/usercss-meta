'use strict';

const {URL} = require('url');

const {ParseError, MissingCharError} = require('./error');
const {
  eatWhitespace,
  parseEOT,
  parseJSON,
  parseString,
  parseStringToEnd,
  parseStringUnquoted,
  parseWord
} = require('./parse-util');

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
// Regex copied from https://github.com/sindresorhus/semver-regex
const RX_SEMVER = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/i;
const RX_URL = /url$/i;

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
  createParser
};
