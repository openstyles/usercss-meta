import test from 'ava';
import usercss from '../index';
import {default as styles} from './styles';

/* Test buildMeta parser only */
styles.forEach(s => {
  test(s.info, t => {
    if (s.error) {
      const error = t.throws(() => usercss.parseMeta(s.input));
      t.is(error.message, s.error);
    } else {
      t.deepEqual(usercss.parseMeta(s.input), s.output);
    }
  });
});
