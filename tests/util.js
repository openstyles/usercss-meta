function extractRange(text) {
  const index = text.indexOf('|');
  return {
    text: text.slice(0, index) + text.slice(index + 1),
    index,
    raw: text
  };
}

function drawRange(text, index) {
  return text.slice(0, index) + '|' + text.slice(index);
}

// https://github.com/avajs/ava/issues/1319
module.exports = {extractRange, drawRange};
