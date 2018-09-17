const {ParseError, MissingCharError, EOFError} = require('./error');

const RX_EOT = /<<<EOT([\s\S]+?)EOT;/y;
const RX_NUMBER = /-?\d+(\.\d+)?\s*/y;
const RX_WHITESPACE = /\s*/y;
const RX_WORD = /([\w-]+)\s*/y;
const RX_STRING_BACKTICK = /(`(?:\\`|[\s\S])*?`)\s*/y;
const RX_STRING_QUOTED = /((['"])(?:\\\2|[^\n])*?\2|\w+)\s*/y;

const JSON_PRIME = {
  __proto__: null,
  'null': null,
  'true': true,
  'false': false
};

function unescapeComment(s) {
  return s.replace(/\*\\\//g, '*/');
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
  return unescapeComment(s);
}

function posOrEnd(haystack, needle, start) {
  const pos = haystack.indexOf(needle, start);
  return pos < 0 ? haystack.length : pos;
}

function eatWhitespace(state) {
  RX_WHITESPACE.lastIndex = state.lastIndex;
  state.lastIndex += RX_WHITESPACE.exec(state.text)[0].length;
}

function parseChar(state) {
  if (state.lastIndex >= state.text.length) {
    throw new EOFError(state.lastIndex);
  }
  state.index = state.lastIndex;
  state.value = state.text[state.lastIndex];
  state.lastIndex++;
  eatWhitespace(state);
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
  state.value = unescapeComment(match[1].trim());
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

function parseStringToEnd(state) {
  const EOL = posOrEnd(state.text, '\n', state.lastIndex);
  const match = state.text.slice(state.lastIndex, EOL);
  state.index = state.lastIndex;
  state.value = unquote(match.trim());
  state.lastIndex += match.length;
}

module.exports = {
  eatWhitespace,
  parseChar,
  parseEOT,
  parseJSON,
  parseNumber,
  parseString,
  parseStringToEnd,
  parseStringUnquoted,
  parseWord,
  unquote
};
