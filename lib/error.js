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

module.exports = {
  ParseError,
  MissingCharError
};
