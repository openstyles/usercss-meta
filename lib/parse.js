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
  dropdown: {
    advanced: parseVarXStyle
  },
  image: {
    var: parseSelect,
    advanced: parseVarXStyle
  },
  number: parseRange,
  range: parseRange
};

const DEFAULT_VAR_VALIDATOR = {
  checkbox: validateCheckbox,
  number: validateRange,
  range: validateRange
};

const MANDATORY_META = ['name', 'namespace', 'version'];
const RANGE_PROPS = ['default', 'min', 'max', 'step'];

function parseRange(state) {
  parseJSON(state);
  const result = {
    min: null,
    max: null,
    step: null,
    units: null
  };
  if (typeof state.value === 'number') {
    result.default = state.value;
  } else if (Array.isArray(state.value)) {
    let i = 0;
    for (const item of state.value) {
      if (typeof item === 'string') {
        if (result.units != null) {
          throw new ParseError({
            code: 'invalidRangeMultipleUnits',
            message: 'units is alredy defined',
            index: state.valueIndex
          });
        }
        result.units = item;
      } else if (typeof item === 'number' || item === null) {
        if (i >= RANGE_PROPS.length) {
          throw new ParseError({
            code: 'invalidRangeTooManyValues',
            message: 'the array contains too many values',
            index: state.valueIndex
          });
        }
        result[RANGE_PROPS[i++]] = item;
      } else {
        throw new ParseError({
          code: 'invalidRangeValue',
          message: 'value must be number, string, or null',
          index: state.valueIndex
        });
      }
    }
  } else {
    throw new ParseError({
      code: 'invalidRange',
      message: 'the default value must be an array or a number',
      index: state.valueIndex
    });
  }
  state.value = result.default;
  Object.assign(state.varResult, result);
}

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
  if (options.length === 0) {
    throw new ParseError({
      code: 'invalidSelectEmptyOptions',
      message: 'Option list is empty',
      index: pos
    });
  }
  if (state.type === 'dropdown') {
    state.varResult.type = 'select';
    state.type = 'select';
  }
  state.varResult.options = options;
  state.value = options[0].name;
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

function validateRange(state) {
  const value = state.value;
  if (typeof value !== 'number') {
    throw new ParseError({
      code: 'invalidRangeDefault',
      message: `the default value of @var ${state.type} must be a number`,
      index: state.valueIndex,
      args: [state.type]
    });
  }
  const result = state.varResult;
  if (result.min != null && value < result.min) {
    throw new ParseError({
      code: 'invalidRangeMin',
      message: 'the value is smaller than the minimum',
      index: state.valueIndex
    });
  }
  if (result.max != null && value > result.max) {
    throw new ParseError({
      code: 'invalidRangeMax',
      message: 'the value is larger than the maximum',
      index: state.valueIndex
    });
  }
  if (result.step != null) {
    const decimal = result.step.toString().split('.')[1];
    const scale = decimal ? 10 ** decimal.length : 0;
    if (value * scale % (result.step * scale)) {
      throw new ParseError({
        code: 'invalidRangeStep',
        message: 'the value is not a multiple of the step',
        index: state.valueIndex
      });
    }
  }
}

function createParser({
  unknownKey = 'ignore',
  mandatoryKeys = MANDATORY_META,
  parseKey: userParseKey,
  parseVar: userParseVar,
  validateKey: userValidateKey,
  validateVar: userValidateVar,
  allowErrors = false
} = {}) {
  if (!['ignore', 'assign', 'throw'].includes(unknownKey)) {
    throw new TypeError("unknownKey must be 'ignore', 'assign', or 'throw'");
  }

  const parser = Object.assign({__proto__: null}, DEFAULT_PARSER, userParseKey);
  const varParser = Object.assign({}, DEFAULT_VAR_PARSER, userParseVar);
  const validator = Object.assign({}, DEFAULT_VALIDATOR, userValidateKey);
  const varValidator = Object.assign({}, DEFAULT_VAR_VALIDATOR, userValidateVar);

  return {parse, validateVar};

  function validateVar(varObj) {
    const state = {
      key: 'var',
      type: varObj.type,
      value: varObj.value,
      varResult: varObj
    };
    _validateVar(state);
  }

  function _validateVar(state) {
    const validate = typeof varValidator[state.type] === 'object' ?
      varValidator[state.type][state.key] : varValidator[state.type];
    if (validate) {
      validate(state);
    }
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
    _validateVar(state);
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
        if (state.key !== 'var' && state.key !== 'advanced' && !state.shouldIgnore) {
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
