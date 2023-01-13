/**
 * Options Module
 */

const inquirer = require('inquirer');
const { to } = require('await-to-js');
const { generatePrompt } = require('@/util');
const chalk = require('chalk');


function parseOptionsFromEnvironmentVariables(options) {
  let incomplete = false;
  const keys = Object.keys(options);
  const result = keys.reduce((acc, current) => {
    const prop = process.env[options[current].environmentVariable];

    /* istanbul ignore else */
    if (!prop) {
      incomplete = true;
    }

    acc[current] = prop;
    return acc;
  }, {});

  /* istanbul ignore else */
  if (incomplete) {
    console.error('Spectrum could not complete this action becasuse the --ci flag was passed but has missing Environment Variables.');
    console.error('The following Environment Variables must be set in order for this task to complete without interation:\n');
    console.info(
      chalk.green(Object.keys(options).map(k => options[k].environmentVariable).join('\n')),
    );
    console.error('\n\nSpectrum exited with error code: 1');
    return process.exit(1);
  }

  return result;
}

async function requestOptions(options = {}) {
  return new Promise(async (resolve, reject) => {
    /* instanbul ignore else */
    if (!options || !Object.keys(options).length) return reject(new Error('No options are provided'));

    // Checks if --ci flag is passed. Will assume env variables for actions
    // since a CI server cannot interact with prompts. Will exit with error code
    // if required options are not found within process.env

    /* istanbul ignore else */
    if (process.env.CI) {
      const result = parseOptionsFromEnvironmentVariables(options);
      return resolve(result);
    }

    const promptOptions = generatePrompt(options);
    const [inqError, response] = await to(inquirer.prompt(promptOptions));

    return inqError ? reject(inqError) : resolve(response);
  });
}

module.exports = {
  requestOptions,
};
