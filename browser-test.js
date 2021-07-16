const fs = require('fs');
const readline = require('readline');

const {extractRange, tryReadJSON} = require('./tests/util');

const cases = [];
const caseRoot = `${__dirname}/tests/cases`;
for (const dir of fs.readdirSync(caseRoot)) {
  const {text, index} = extractRange(
    fs.readFileSync(`${caseRoot}/${dir}/text.txt`, 'utf8').replace(/\r/g, '')
  );
  const metadata = tryReadJSON(`${caseRoot}/${dir}/metadata.json`);
  const error = tryReadJSON(`${caseRoot}/${dir}/error.json`);
  cases.push({
    name: dir,
    metadata,
    text,
    error,
    errorIndex: index
  });
}

const runTest = (usercssMeta, cases) => {
  function deepEqual(a, b) {
    if (typeof a !== typeof b) {
      return false;
    }

    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
      return a === b;
    }

    const bKeys = new Set(Object.keys(b));
    for (const key of Object.keys(a)) {
      if (!bKeys.has(key)) {
        return false;
      }

      bKeys.delete(key);
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }

    if (bKeys.size) {
      return false;
    }

    return true;
  }

  for (const case_ of cases) {
    console.log(`%c${case_.name}`, 'color: green');
    try {
      const {metadata} = usercssMeta.parse(case_.text, {mandatoryKeys: []});
      console.assert(deepEqual(metadata, case_.metadata), 'metadata mismatch');
    } catch (err) {
      console.assert(case_.error, 'unexpected error');
      if (!case_.error) {
        console.error(err);
      }

      for (const key of Object.keys(case_.error)) {
        console.assert(deepEqual(case_.error[key], err[key]), `error ${key} mismatch`);
      }

      if (err.index != null) {
        console.assert(err.index === case_.errorIndex, 'index mismatch');
      }
    }
  }

  console.log('done');
};

fs.writeFileSync('browser-test.html', `
<script src="dist/usercss-meta.js"></script>
<script>(${runTest})(usercssMeta, ${JSON.stringify(cases, null, 2)})</script>
`, 'utf8');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Open browser-test.html and check if all tests have passed (y/N): ', ans => {
  if (!/y/i.test(ans)) {
    process.exit(1); // eslint-disable-line unicorn/no-process-exit
  }

  rl.close();
});
