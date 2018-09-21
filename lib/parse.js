'use strict';

const {URL} = require('url');

const semverRegex = require('semver-regex');

const {ParseError, MissingCharError} = require('./error');
const {
  eatLine,
  eatWhitespace,
  parseEOT,
  parseJSON,
  parseString,
  parseStringToEnd,
  parseStringUnquoted,
  parseWord,
  parseChar
} = require('./parse-util');

const DEFAULT_PARSER = {
  name: parseStringToEnd,
  version: parseStringToEnd,
  namespace: parseStringToEnd,
  author: parseStringToEnd,
  description: parseStringToEnd,
  homepageURL: parseStringToEnd,
  supportURL: parseStringToEnd,
  updateURL: parseStringToEnd,
  license: parseStringToEnd,
  preprocessor: parseStringToEnd
};

const DEFAULT_VALIDATOR = {
  version: validateVersion,
  homepageURL: validateURL,
  supportURL: validateURL,
  updateURL: validateURL
};

const DEFAULT_VAR_PARSER = {
  text: parseStringToEnd,
  color: parseStringToEnd,
  checkbox: parseChar,
  select: parseSelect,
  dropdown: parseVarXStyle,
  image: {
    var: parseSelect,
    advanced: parseVarXStyle
  }
};

const DEFAULT_VAR_VALIDATOR = {
  checkbox: validateCheckbox,
  dropdown: validateXStyle,
  image: {
    advanced: validateXStyle
  }
};

const MANDATORY_META = ['name', 'namespace', 'version'];

function parseSelect(state) {
  parseJSON(state);
  const options = Array.isArray(state.value) ?
    state.value.map(key => createOption(key)) :
    Object.entries(state.value).map(([key, value]) => createOption(key, value));
  if (options.length === 0) {
    throw new ParseError({
      code: 'invalidSelectEmptyOptions',
      message: 'Option list is empty',
      index: state.valueIndex
    });
  }
  const defaults = options.filter(o => o.isDefault);
  if (defaults.length > 1) {
    throw new ParseError({
      code: 'invalidSelectMultipleDefaults',
      message: 'multiple default values',
      index: state.valueIndex
    });
  }
  options.forEach(o => {
    delete o.isDefault;
  });
  state.varResult.options = options;
  state.value = (defaults.length > 0 ? defaults[0] : options[0]).name;
}

function parseVarXStyle(state) {
  const pos = state.lastIndex;
  if (state.text[state.lastIndex] !== '{') {
    throw new MissingCharError(['{'], pos);
  }
  const options = [];
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

    options.push(option);
  }
  state.lastIndex++;
  eatWhitespace(state);
  state.value = options;
}

function createOption(label, value) {
  let isDefault = false;
  if (label.endsWith('*')) {
    isDefault = true;
    label = label.slice(0, -1);
  }
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
  return {name, label, value, isDefault};
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

function validateVersion(state) {
  if (!semverRegex().test(state.value)) {
    throw new ParseError({
      code: 'invalidVersion',
      args: [state.value],
      message: `Invalid version: ${state.value}`,
      index: state.valueIndex
    });
  }
  state.value = normalizeVersion(state.value);
}

function validateURL(state) {
  let url;
  try {
    url = new URL(state.value);
  } catch (err) {
    err.args = [state.value];
    err.index = state.valueIndex;
    throw err;
  }
  if (!/^https?:/.test(url.protocol)) {
    throw new ParseError({
      code: 'invalidURLProtocol',
      args: [url.protocol],
      message: `Invalid protocol: ${url.protocol}`,
      index: state.valueIndex
    });
  }
}

function validateCheckbox(state) {
  if (state.value !== '1' && state.value !== '0') {
    throw new ParseError({
      code: 'invalidCheckboxDefault',
      message: 'value must be 0 or 1',
      index: state.valueIndex
    });
  }
}

function validateXStyle(state) {
  if (state.value.length === 0) {
    throw new ParseError({
      code: 'invalidSelectEmptyOptions',
      message: 'Option list is empty',
      index: state.valueIndex
    });
  }
  state.varResult.options = state.value;
  state.value = state.value[0].name;
}

function createParser({
  unknownKey = 'ignore',
  mandatoryKeys = MANDATORY_META,
  parseKey: userParseKey,
  parseVar: userParseVar,
  validateKey,
  validateVar,
  allowErrors = false
} = {}) {
  if (!['ignore', 'assign', 'throw'].includes(unknownKey)) {
    throw new TypeError("unknownKey must be 'ignore', 'assign', or 'throw'");
  }

  const parser = Object.assign({__proto__: null}, DEFAULT_PARSER, userParseKey);
  const varParser = Object.assign({}, DEFAULT_VAR_PARSER, userParseVar);
  const validator = Object.assign({}, DEFAULT_VALIDATOR, validateKey);
  const varValidator = Object.assign({}, DEFAULT_VAR_VALIDATOR, validateVar);

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

    const doParse = typeof varParser[state.type] === 'object' ?
      varParser[state.type][state.key] : varParser[state.type];
    if (!doParse) {
      throw new ParseError({
        code: 'unknownVarType',
        message: `Unknown @${state.key} type: ${state.type}`,
        args: [state.key, state.type],
        index: state.index
      });
    }

    parseWord(state);
    result.name = state.value;

    parseString(state);
    result.label = state.value;

    state.valueIndex = state.lastIndex;
    doParse(state);
    const validate = typeof varValidator[state.type] === 'object' ?
      varValidator[state.type][state.key] : varValidator[state.type];
    if (validate) {
      validate(state);
    }
    result.default = state.value;
    if (!state.usercssData.vars) {
      state.usercssData.vars = {};
    }
    state.usercssData.vars[result.name] = result;
    if (state.key === 'advanced') {
      state.maybeUSO = true;
    }
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
          if (state.key === 'var' || state.key === 'advanced') {
            parseVar(state);
          } else {
            parseKey(state);
          }
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
    let doParse = parser[state.key];
    if (!doParse) {
      if (unknownKey === 'assign') {
        doParse = parseStringToEnd;
      } else {
        eatLine(state);
        if (unknownKey === 'ignore') {
          state.shouldIgnore = true;
          return;
        }
        // throw
        throw new ParseError({
          code: 'unknownMeta',
          args: [state.key],
          message: `Unknown metadata: @${state.key}`,
          index: state.index
        });
      }
    }
    state.valueIndex = state.lastIndex;
    doParse(state);
    if (validator[state.key]) {
      validator[state.key](state);
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
