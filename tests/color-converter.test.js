import test from 'ava';
import usercss from '../index';

const color = usercss.color;

test(t => {
  /* Not testing constrainHue, snapToInt */
  const ALPHA = 0.6666666666666666;
  // weird!
  const invalid1 = {r: NaN, g: NaN, b: 10, a: NaN, type: 'hex'};
  const invalid2 = {r: NaN, g: NaN, b: undefined, a: undefined, type: 'hex'};

  t.is(color.NAMED_COLORS.get('darkgoldenrod'), '#b8860b');
  t.is(color.parse(123), undefined);
  t.deepEqual(color.parse('darkgoldenrod'), {r: 184, g: 134, b: 11, a: undefined, type: 'hex'});
  t.deepEqual(color.parse('#b8860b'), {r: 184, g: 134, b: 11, a: undefined, type: 'hex'});
  t.deepEqual(color.parse('#b8860baa'), {r: 184, g: 134, b: 11, a: ALPHA, type: 'hex'});
  t.deepEqual(color.parse('rgb(184, 134, 11)'), {r: 184, g: 134, b: 11, a: 1, type: 'rgb'});
  t.deepEqual(color.parse(`rgba(184, 134, 11, ${ALPHA})`), {r: 184, g: 134, b: 11, a: ALPHA, type: 'rgb'});
  t.deepEqual(color.parse('hsl(0, 0, 67)'), {h: 0, s: 0, l: 67, a: 1, type: 'hsl'});

  // These cases are not processed in Stylus because of CSSLint integration
  t.deepEqual(color.parse('#(invalid)'), invalid1);
  t.deepEqual(color.parse('#[]'), invalid2);
  t.deepEqual(color.parse('#()'), invalid2);
  t.deepEqual(color.parse('#123()'), {r: 18, g: 3, b: undefined, a: undefined, type: 'hex'});

  // format(color, type, hexUppercase)
  t.is(color.format({r: 184, g: 134, b: 11, a: undefined}, 'rgb'), 'rgb(184, 134, 11)');
  t.is(color.format({r: 184, g: 134, b: 11, a: ALPHA}, 'rgb'), 'rgba(184, 134, 11, .667)');
  t.is(color.format({r: 184, g: 134, b: 11, a: undefined}, 'hex', false), '#b8860b');
  t.is(color.format({r: 184, g: 134, b: 11, a: ALPHA}, 'hex', false), '#b8860baa');
  t.is(color.format({h: 0, s: 0, l: 67}, 'hsl'), 'hsl(0, 0%, 67%)');
  t.is(color.format({h: 0, s: 0, l: 67, a: ALPHA}, 'hsl'), 'hsla(0, 0%, 67%, .667)');
  t.is(color.format({h: 0, s: 0, l: 66.7, a: ALPHA, type: 'hsl'}, 'rgb'), 'rgba(170, 170, 170, .667)');

  t.is(color.formatAlpha(ALPHA), '.667');
  t.is(color.formatAlpha(1 / 2), '.5');

  t.deepEqual(
    color.RGBtoHSV({r: 184, g: 134, b: 11, a: undefined}),
    {h: 42.65895953757225, s: 0.9402173913043479, v: 0.7215686274509804, a: undefined}
  );
  t.deepEqual(
    color.RGBtoHSV({r: 184, g: 134, b: 11, a: ALPHA}),
    {h: 42.65895953757225, s: 0.9402173913043479, v: 0.7215686274509804, a: ALPHA}
  );

  // No alpha channel parameter
  t.deepEqual(
    color.HSVtoRGB({h: 42, s: 0.9, v: 0.7}),
    {r: 179, g: 130, b: 18}
  );

  t.deepEqual(
    color.HSLtoHSV({h: 43, l: 38, s: 89, a: undefined}),
    {h: 43, s: 0.9417989417989419, v: 0.7182, a: undefined}
  );
  t.deepEqual(
    color.HSLtoHSV({h: 43, s: 89, l: 38, a: 0.667}),
    {h: 43, s: 0.9417989417989419, v: 0.7182, a: 0.667}
  );

  // No alpha channel parameter
  t.deepEqual(
    color.HSVtoHSL({h: 42.65895953757225, s: 0.9402173913043479, v: 0.7215686274509804}),
    {h: 43, l: 38, s: 89}
  );
});
