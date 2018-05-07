const {execSync} = require('child_process');

const remote = 'StylishThemes/parse-usercss';

function exec(command) {
  return execSync(command, {encoding: 'utf8'});
}

if (!exec('git status').includes('On branch master')) {
  throw new Error('Must release on master branch');
}

if (!exec('git remote get-url origin').includes(remote)) {
  throw new Error(`Remote must be ${remote}`);
}

exec('git pull');
