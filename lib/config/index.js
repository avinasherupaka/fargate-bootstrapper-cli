/**
 * SPECTRUM CLI CONFIGURATION
 */

const { to } = require('await-to-js');
const { promisify } = require('util');
const { readFile, writeFile } = require('fs');
const BASE_CONFIGURATION = require('./spectrum.base.config.json');

let config = {};

async function writeConfigFileToDisk(configurationData) {
  const writeFileAsync = promisify(writeFile);
  const [writeError] = await to(writeFileAsync('spectrum.config.json', JSON.stringify(configurationData, null, 2)));

  if (writeError) {
    console.error('Failed to create configuration file.', writeError);
  }
}

async function loadConfigurationFile(overwrite) {
  const readFileAsync = promisify(readFile);
  const cwd = process.cwd();
  const [fileError, file] = await to(readFileAsync(`${cwd}/spectrum.config.json`));

  if (fileError) {
    if (overwrite) {
      await writeConfigFileToDisk(BASE_CONFIGURATION);
      return Promise.resolve(BASE_CONFIGURATION);
    }
    console.error('There was an error loading the spectrum config file.\nPlease ensure you are in the project root or have the project initialized.');
    return process.exit(1);
  }

  const parsedFile = JSON.parse(file.toString());

  return Promise.resolve(parsedFile);
}

async function getConfig() {
  if (!Object.keys(config).length) {
    config = await loadConfigurationFile();
  }

  return Promise.resolve(config);
}

async function setConfig(configurationObject) {
  if (!Object.keys(config).length) {
    config = await loadConfigurationFile(true);
  }

  config = Object.assign({}, config, configurationObject);

  await writeConfigFileToDisk(config);
}


module.exports = {
  testing: process.env.TESTING,
  getConfig,
  setConfig,
};
