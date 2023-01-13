/**
 * Utils
 */
const { getConfig } = require('@/config');
const chalk = require('chalk');
const path = require('path');
const { readdirSync, readFileSync } = require('fs');
const { writeToSpectrumDirectory, parseEnvironmentVariablesForParams } = require('./helpers');
const { userInfo } = require('os');
const { to } = require('await-to-js');
const pkg = require('../../package.json');
const checkForUpdate = require('update-check');

function generatePrompt(schema) {
  /* istanbul ignore else */
  if (!schema || typeof schema !== 'object') throw new Error('No prompt schema is provided');

  const defaultOptions = {
    type: 'string',
  };
  const keys = Object.keys(schema);

  const options = keys.map(name => Object.assign({}, defaultOptions, { name }, schema[name]));

  return options;
}

/**
 * @function checkEnvironment
 * @description Checks project directory to see if it's been initalized
 */
function checkEnvironment() {
  const files = readdirSync(process.cwd());

  /* istanbul ignore else */
  if (files.indexOf('spectrum.config.json') === -1) {
    console.info('\nThis directory has not been initialized. \nPlease ensure you are in the project root directory. \nOr run the following command to initialize:\n');
    console.info(chalk.green('spectrum init\n'));
    return process.exit(1);
  }

  return true;
}


async function createTagsFile({ projectName } = {}) {
  return new Promise(async (resolve) => {
    const TAGS_FILE_TEMPLATE = path.join(__dirname, '../templates/tags.json.txt');
    const config = await getConfig();
    const {
      CostCenter,
      ProjectName,
    } = config;
    const tagsFileData = readFileSync(TAGS_FILE_TEMPLATE).toString();

    const tagsFile = tagsFileData
      .replace('__OWNER__', userInfo().username)
      .replace('__COST_CENTER__', CostCenter)
      .replace('__PROJECT_NAME__', projectName || ProjectName);

    await writeToSpectrumDirectory('tags.json', tagsFile);

    return resolve(true);
  });
}

async function createParamsFile({ environmentVariables = {}, tag = 'latest', projectName } = {}) {
  return new Promise(async (resolve) => {
    const APP_PARAMS_TEMPLATE = path.join(__dirname, '../templates/app-parameters.json.txt');
    const config = await getConfig();
    const {
      ProjectName,
      FargateStackName,
      FargateAccountId,
      FargateRegion,
      HealthCheckPath,
      HealthCheckIntervalSeconds,
    } = config;
    const paramFileData = readFileSync(APP_PARAMS_TEMPLATE).toString();

    const paramFile = paramFileData
      .replace('__APPLICATION_NAME__', projectName || ProjectName)
      .replace('__HEALTH_CHECK_PATH__', HealthCheckPath)
      .replace('__IMAGE_URL__', `${FargateAccountId}.dkr.ecr.${FargateRegion}.amazonaws.com/${ProjectName}:${tag}`)
      .replace('__FARGATE_STACK_NAME__', FargateStackName)
      .replace('__HEALTH_CHECK_INTERVAL__', (HealthCheckIntervalSeconds || 60))
      .replace('__ENVIRONMENT_VARIABLES__', parseEnvironmentVariablesForParams(environmentVariables));

    await writeToSpectrumDirectory('app-parameters.json', paramFile);

    return resolve(true);
  });
}

async function checkVersion() {
  /* istanbul ignore else */
  if (process.env.SPECTRUM_VERSION_CHECK) return;

  process.env.SPECTRUM_VERSION_CHECK = true;
  const INSTALL_COMMAND = `npm install --global ${pkg.name}`;


  const [err, update] = await to(checkForUpdate(pkg));

  /* istanbul ignore else */
  if (err) {
    return console.error(`Failed to check for updates: ${err}`);
  }

  /* istanbul ignore else */
  if (update) {
    console.info(`\n\nSpectrum has an update available: ${chalk.green(update.latest)}`);
    console.info(`Update by running: ${chalk.yellow(INSTALL_COMMAND)}\n\n`);
  }
}

module.exports = {
  generatePrompt,
  checkEnvironment,
  createParamsFile,
  createTagsFile,
  checkVersion,
};
