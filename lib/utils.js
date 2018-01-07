'use strict';

/* eslint-disable arrow-parens, operator-linebreak */
// Copied from Stylus/background/storage.js
const RX_NAMESPACE = new RegExp([/[\s\r\n]*/,
  /(@namespace[\s\r\n]+(?:[^\s\r\n]+[\s\r\n]+)?url\(http:\/\/.*?\);)/,
  /[\s\r\n]*/].map(rx => rx.source).join(''), 'g');
const RX_CSS_COMMENTS = /\/\*[\s\S]*?\*\//g;

function styleCodeEmpty(code) {
  // Collect the global section if it's not empty, not comment-only, not namespace-only.
  const cmtOpen = code && code.indexOf('/*');
  if (cmtOpen >= 0) {
    const cmtCloseLast = code.lastIndexOf('*/');
    if (cmtCloseLast < 0) {
      code = code.substr(0, cmtOpen);
    } else {
      code = code.substr(0, cmtOpen) +
        code.substring(cmtOpen, cmtCloseLast + 2).replace(RX_CSS_COMMENTS, '') +
        code.substr(cmtCloseLast + 2);
    }
  }
  return !code
    || !code.trim()
    || code.includes('@namespace') && !code.replace(RX_NAMESPACE, '').trim();
};
