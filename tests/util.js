const fs = require('fs');

function extractRange(text) {
  const index = text.indexOf('|');
  if (index < 0) {
    return {text};
  }
  return {
    text: text.slice(0, index) + text.slice(index + 1),
    index,
    raw: text
  };
}

function drawRange(text, index) {
  return text.slice(0, index) + '|' + text.slice(index);
}

function tryReadJSON(path) {
  let text = null;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch (err) {
    return;
  }
  return JSON.parse(text);
}

// https://github.com/avajs/ava/issues/1319
module.exports = {extractRange, drawRange, tryReadJSON};
