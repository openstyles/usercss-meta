const {execSync} = require('child_process');

const repoName = 'openstyles/usercss-meta';

function exec(command) {
  return execSync(command, {encoding: 'utf8'});
}

const status = exec('git status');
if (!status.includes('On branch master')) {
  throw new Error('Must release on master branch');
}

const remote = exec('git remote show origin');
if (!remote.match(/Push\s+URL:(.+)/)[1].includes(repoName)) {
  throw new Error(`Remote must be ${repoName}`);
}

if (!/master\s+pushes to master\s+\((up to date|fast-forwardable)\)/.test(remote)) {
  throw new Error('Local out of date. Please `git pull` first');
}
