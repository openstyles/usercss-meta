# parse-usercss
> Parse usercss styles supported by the Stylus userstyle manager


## Install

```
$ npm install --save parse-usercss
```


## Usage

### Parser

In this release, only the metadata portion of the usercss style is parsed.

```js
const usercss = require('parse-usercss');

usercss.parseMeta(`/* ==UserStyle==
@name        test
@namespace   github.com/openstyles/stylus
@version     0.1.0
@description my userstyle
@author      Me
@var text my-color "Select a color" #123456
==/UserStyle== */
@-moz-document domain("example.com") {
 /* */
}`);

/* => {
  author: 'Me',
  description: 'my userstyle',
  enabled: true,
  name: 'test',
  reason: 'install',
  sections: [],
  sourceCode: "/* ==UserStyle==\n  @name        test\n  @namespace   github.com/openstyles/stylus\n  @version     0.1.0\n  @description my userstyle\n  @author      Me\n  @var color font-color 'Font-color' #123456\n  ==/UserStyle==\n *\/\n  @-moz-document domain("example.com") {\n   /* *\/\n  }",
  usercssData: {
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
  },
}
*/
```

### Color

This module includes several components

#### Named color reference

```js
const {color} = require('parse-usercss');

color.NAMED_COLORS.get('darkgoldenrod');
//=> #b8860b
```

#### Color parser

```js
const {color} = require('parse-usercss');

// parse(string)
color.parse('darkgoldenrod')
//=> {r: 184, g: 134, b: 11, a: undefined, type: 'hex'}

color.parse('#b8860b');
//=> {r: 184, g: 134, b: 11, a: undefined, type: 'hex'}

color.parse('#b8860baa');
//=> {r: 184, g: 134, b: 11, a: 0.6666666666666666, type: 'hex'}

color.parse('rgb(184, 134, 11)');
//=> {r: 184, g: 134, b: 11, a: 1, type: 'rgb'}

color.parse('hsl(0, 0, 67)');
//=> {h: 0, s: 0, l: 67, a: 1, type: 'hsl'}
```

#### Color Formatter

```js
const {color} = require('parse-usercss');

// format(color, type, hexUppercase)
color.format({r: 184, g: 134, b: 11, a: 0.667}, 'hex', true);
//=> #B8860BAA

color.format({r: 184, g: 134, b: 11}, 'rgb');
//=> rgb(184, 134, 11)

color.format({h: 0, s: 0, l: 67, a: 0.667}, 'hsl');
//=> hsla(0, 0%, 67%, .667)

// type: 'hsl' is required in this case!
color.format({h: 0, s: 0, l: 66.7, a: 0.667, type: 'hsl'}, 'rgb');
//=> rgba(170, 170, 170, .667)
```

#### Color conversion

```js
const {color} = require('parse-usercss');

color.RGBtoHSV({r: 184, g: 134, b: 11});
//=> {h: 42.65895953757225, s: 0.9402173913043479, v: 0.7215686274509804, a: undefined}

// alpha channel isn't supported
color.HSVtoRGB({h: 42, s: 0.9, v: 0.7})
//=> {r: 179, g: 130, b: 18}

color.HSLtoHSV({h: 43, l: 38, s: 89, a: undefined});
//=> {h: 43, s: 0.9417989417989419, v: 0.7182, a: undefined}

// alpha channel isn't supported
color.HSVtoHSL({h: 42, s: 0.9, v: 0.7})
//=> {h: 42, s: 82, l: 39}
```

## Related

- [Stylus userstyle manager](https://github.com/openstyles/stylus) - source of most of this code
- [usercss metadata spec](https://github.com/openstyles/stylus/wiki/Usercss)
- [xStyle metadata spec](https://github.com/FirefoxBar/xStyle/wiki/Style-format#userless-representation) - Also supported by this parser

## License

MIT
