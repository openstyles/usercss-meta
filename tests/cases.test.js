import fs from 'fs';
import test from 'ava';

import {stringify, parse} from '..';
import {drawRange, extractRange} from './util';

function tryReadJSON(path) {
  let text = null;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch (err) {
    return;
  }
  return JSON.parse(text);
}

for (const dir of fs.readdirSync(`${__dirname}/cases`)) {
  test(dir, t => {
    const {text, raw} = extractRange(
      fs.readFileSync(`${__dirname}/cases/${dir}/text.txt`, 'utf8').replace(/\r/g, '')
    );
    const metadata = tryReadJSON(`${__dirname}/cases/${dir}/metadata.json`);
    const error = tryReadJSON(`${__dirname}/cases/${dir}/error.json`);

    function run() {
      return parse(text, {mandatoryKeys: []});
    }

    if (error) {
      const err = t.throws(run);
      for (const [key, value] of Object.entries(error)) {
        t.deepEqual(err[key], value);
      }
      if (err.index != null) {
        t.is(drawRange(text, err.index), raw);
      }
      return;
    }

    const result = run();
    t.deepEqual(result.metadata, metadata);

    const newText = stringify(metadata);
    const {metadata: newMetadata} = parse(newText, {mandatoryKeys: []});
    t.deepEqual(newMetadata, metadata);
  });
}
