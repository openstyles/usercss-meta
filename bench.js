const fetch = require('node-fetch');
const {parse} = require('.');

const RX_HEADER = /\/\*\s*==UserStyle==[\s\S]+?==\/UserStyle==\s*\*\//;

// these cases are picked from https://github.com/search?o=desc&q=usercss&s=updated&type=Repositories
const cases = [
  'https://raw.githubusercontent.com/StylishThemes/GitHub-Dark/master/github-dark.user.css',
  'https://github.com/stonecrusher/stylus-UserCSS/raw/master/WEBde/webde-geputzt.user.css',
  'https://github.com/AviSynthPlus/twiFixWebLite/raw/devel/twiFixWebLite.user.css',
  'https://github.com/FlandreDaisuki/My-Browser-Extensions/raw/master/usercss/FaceBullshit.user.css'
];

(async () => {
  for (const url of cases) {
    console.log(url);
    const text = await (await fetch(url)).text(); // eslint-disable-line no-await-in-loop
    const {metadata} = parse(text.match(RX_HEADER)[0]);
    console.log(metadata);
  }
})();
