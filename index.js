'use strict';

const {buildMeta} = require('./lib/usercss');
const {parse, format, formatAlpha, RGBtoHSV, HSVtoRGB, HSLtoHSV, HSVtoHSL, NAMED_COLORS} = require('./lib/colorconverter');

module.exports = {
  parseMeta: buildMeta,
  color: {
    parse,
    format,
    formatAlpha,
    RGBtoHSV,
    HSVtoRGB,
    HSLtoHSV,
    HSVtoHSL,
    NAMED_COLORS
  }
};
