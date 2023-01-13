/* eslint-disable */
const { readdirSync, readFileSync, mkdirSync, writeFileSync } = require('fs');
const path = require('path');
const chalk = require('chalk');

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

  /* istanbul ignore next */
  return true;
}

async function writeToSpectrumDirectory(file, data) {
  checkEnvironment();
  return new Promise((resolve, reject) => {
    const dir = readdirSync(process.cwd());
    const spectrumDirectory = path.join(process.cwd(), '.spectrum');
    const FargateDeploymentYml = readFileSync(path.join(__dirname, '../templates/fargate-application.yml')).toString();

    /* istanbul ignore else */
    if (dir.indexOf('.spectrum') === -1) {
      mkdirSync(spectrumDirectory);
    }

    writeFileSync(path.join(spectrumDirectory, 'fargate-application.yml'), FargateDeploymentYml);

    writeFileSync(path.join(spectrumDirectory, file), data);

    return resolve();
  });
}

function parseEnvironmentVariablesForParams(env = {}) {
  const base = '{"Name": "PORT", "Value": "80"}';
  const props = Object.keys(env);
  const list = [base];

  /* istanbul ignore else */
  if (props.length) {
    props.forEach(prop => {
      const propertyString = `{ \"Name\": \"${prop}\", \"Value\": \"${env[prop]}\" }`;
      list.push(propertyString);
    });
  }

  const envTemplate = `[ ${list} ]`;

  return JSON.stringify(envTemplate).substring(1).slice(0, -1);
}

module.exports = {
  writeToSpectrumDirectory,
  parseEnvironmentVariablesForParams,
};
