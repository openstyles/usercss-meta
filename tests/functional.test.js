const test = require('ava');
const {default: endent} = require('endent');
const usercssMeta = require('..');

test('Readme example', t => {
  const {metadata} = usercssMeta.parse(`
    /* ==UserStyle==
    @name        test
    @namespace   github.com/openstyles/stylus
    @version     0.1.0
    @description my userstyle
    @author      Me
    @var text my-color "Select a color" #123456
    ==/UserStyle== */
  `);

  t.deepEqual(metadata, {
    name: 'test',
    namespace: 'github.com/openstyles/stylus',
    version: '0.1.0',
    description: 'my userstyle',
    author: 'Me',
    vars: {
      'my-color': {
        type: 'text',
        label: 'Select a color',
        name: 'my-color',
        value: null,
        default: '#123456',
        options: null
      }
    }
  });

  t.deepEqual(usercssMeta.stringify(metadata, {alignKeys: true}), endent`
    /* ==UserStyle==
    @name        test
    @namespace   github.com/openstyles/stylus
    @version     0.1.0
    @description my userstyle
    @author      Me
    @var         text my-color "Select a color" #123456
    ==/UserStyle== */
  `);
});
