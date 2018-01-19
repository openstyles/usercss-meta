# parse-usercss
> Parse usercss metadata supported by the Stylus userstyle manager


## Install

```
$ npm install --save parse-usercss
```


## Usage

```js
const {parseUsercss} = require('parse-usercss');

parseUsercss(`/* ==UserStyle==
@name        test
@namespace   github.com/openstyles/stylus
@version     0.1.0
@description my userstyle
@author      Me
@var text my-color "Select a color" #123456
==/UserStyle== */`);

/* => {
  "vars": {
    "my-color": {
      "type": "text",
      "label": "Select a color",
      "name": "my-color",
      "value": null,
      "default": "#123456",
      "options": null
    }
  },
  "name": "test",
  "namespace": "github.com/openstyles/stylus",
  "version": "0.1.0",
  "description": "my userstyle",
  "author": "Me"
}
*/
```

## API Reference

This module exports following members:

* `parseUsercss`: Function. Parse metadata and return an object.
* `createParser`: Function. Create a metadata parser.
* `ParseError`: Class.
* `util`: Object. A collection of parser utilities.

### parseUsercss(metadata: string, options?: object): object

This is a shortcut of

```js
createParser(options).parse(metadata);
```

### createParser(options?: object): Parser object

`options` may contain following properties:

* `unknownKey`: String. Change the behavior when an unknown key is parsed. Possible values are:

  - `ignore`: The directive is ignored. Default.
  - `assign`: Assign the text value (characters before `\s*\n`) to result object.
  - `throw`: Throw a ParseError.

* `mandatoryKeys`: Array&lt;string>. Mark multiple keys as mandatory. If the key is missing in the metadata, the parser would throw an error. Default: `['name', 'namespace', 'version']`
* `parseKey`: Object. Extend the parser to parse additional keys. The object is a map of `key: parseFunction` pair. For example:

  ```js
  const parser = createParser({
    mandatoryKeys: [],
    parseKey: {
      myKey: state => {
        const rx = /\d+/y;
        rx.lastIndex = state.lastIndex;
        const match = rx.exec(state.text);
        if (!match) {
          throw new ParseError('value must be numbers', state, state.lastIndex);
        }
        state.index = match.index;
        state.lastIndex = rx.lastIndex;
        state.value = match[0];
      }
    }
  });
  const result = parser.parse(`/* ==UserStyle==
  @myKey 123456
  ==/UserStyle==`);
  assert(result.myKey === '123456');
  ```

* `parseVar`: Object. Extend the parser to parse additional variable types. The object is a map of `varType: parseFunction` pair. For example:

  ```js
  const parser = createParser({
    mandatoryKeys: [],
    parseVar: {
      myvar: state => {
        const rx = /\d+/y;
        rx.lastIndex = state.lastIndex;
        const match = rx.exec(state.text);
        if (!match) {
          throw new ParseError('value must be numbers', state, state.lastIndex);
        }
        state.index = match.index;
        state.lastIndex = rx.lastIndex;
        state.value = match[0];
      }
    }
  });
  const result = parser.parse(`/* ==UserStyle==
  @var myvar var-name 'Customized variable' 123456
  ==/UserStyle== */`);
  const va = result.vars['var-name'];
  assert(va.type === 'myvar');
  assert(va.label === 'Customized variable');
  assert(va.default === '123456');
  ```

This function returns a parser object which contains following members:

* `parse(text: string): ParseResult object`: Function. Parse the string into a result object.

### new ParseError(message, state: object, index: number)

Use this class to initiate a parse error. When catching the error, `state` and `index` can be accessed from `error.state` and `error.index`.

### util

A collection of parser utilities. Some of them might be useful when extending the parser.

* `eatWhitespace(state)`: Move `state.lastIndex` to next non-whitespace character.
* `parseEOT(state)`: Parse EOT multiline string used by xStyle extension.
* `parseJSON(state)`: Parse JSON value. Note that the JSON parser can parse some additional syntax like single quoted string, backtick quoted multiline string, etc.
* `parseNumber(state)`: Parse numbers.
* `parseString(state)`: Parse quoted string.
* `parseStringToEnd(state)`: Parse the text value before line feed.
* `parseWord(state)`: Parse a word. (`[\w-]+`)

## Related

- [Stylus userstyle manager](https://github.com/openstyles/stylus) - source of most of this code
- [usercss metadata spec](https://github.com/openstyles/stylus/wiki/Usercss)
- [xStyle metadata spec](https://github.com/FirefoxBar/xStyle/wiki/Style-format#userless-representation) - Also supported by this parser

## License

MIT
