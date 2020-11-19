const fetch = require('node-fetch');
const cheerio = require('cheerio');

fetch('https://drafts.csswg.org/css-values-4/')
  .then(r => r.text())
  .then(text => {
    const $ = cheerio.load(text);
    const units = [];
    $('.heading').each((i, heading) => {
      const level = $(heading).data('level');
      if (!level || !/^[67]\./.test(level)) {
        return;
      }

      $(heading).find('.css').each((i, css) => {
        const unit = $(css).text();
        if (unit[0] !== '<') {
          units.push(unit);
        }
      });
    });
    units.push('%');
    console.log(`module.exports = [${units.map(u => `'${u}'`).join(', ')}];`);
  });
