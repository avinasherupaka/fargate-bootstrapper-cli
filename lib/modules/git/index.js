/**
 * GIT Module
 */

const { shell } = require('execa');
const { to } = require('await-to-js');

/**
* @function getBranch
* @desc Returns the current git branch in a directory
*/
async function getBranch() {
  const GIT_BRANCH_COMMAND = 'git branch';
  const [shellError, output] = await to(shell(GIT_BRANCH_COMMAND));

  /* istanbul ignore else */
  if (shellError) {
    console.error(shellError);
    console.error('There was a problem requesting the git branch. Exiting with code 1');
    return process.exit(1);
  }

  const { stdout } = output;
  const result = stdout
    .split('\n')
    .filter(entry => entry.includes('*'))
    .map(entry => entry.trim())
    .map(entry => entry.split('*')[1].trim())
    .join('');

  return result || 'master';
}

module.exports = {
  getBranch,
};
