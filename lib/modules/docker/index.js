/**
 * Docker Module
 * @description Handles Docker commands within a wrapper for Spectrum
 */

const { to } = require('await-to-js');
const { shell } = require('execa');
const { FARGATE_REGION } = require('@/env');

async function buildDockerContainer(containerName, tag = 'latest') {
  return new Promise(async (resolve, reject) => {
    /* istanbul ignore else */
    if (!containerName) return reject(new Error('No Container Name Specified'));

    const dockerShellCommand = `docker build -t spectrum/${containerName}:${tag} .`;
    const [shellError, result] = await to(shell(dockerShellCommand));

    /* istanbul ignore else */
    if (shellError) return reject(shellError);
    return resolve(result);
  });
}

async function tagContainer(containerName, accountId, tag = 'latest') {
  return new Promise(async (resolve, reject) => {
    /* istanbul ignore else */
    if (!containerName) return reject(new Error('Container name is required'));

    /* istanbul ignore else */
    if (!accountId) return reject(new Error('Fargate account ID is required'));

    const dockerTagCommand = `docker tag spectrum/${containerName}:${tag} ${accountId}.dkr.ecr.${FARGATE_REGION}.amazonaws.com/${containerName}:${tag}`;

    const [shellError, result] = await to(shell(dockerTagCommand));

    /* istanbul ignore else */
    if (shellError) {
      return reject(shellError);
    }

    return resolve(result);
  });
}

/**
 * @function pruneImages
 * @description Cleans up unused docker images stored locally
 */
async function pruneImages() {
  return new Promise(async (resolve, reject) => {
    const DOCKER_PRUNE_COMMAND = 'docker image prune --force';

    const [err, result] = await to(shell(DOCKER_PRUNE_COMMAND));

    /* istanbul ignore else */
    if (err) {
      return reject(err);
    }

    return resolve(result);
  });
}

module.exports = {
  buildDockerContainer,
  tagContainer,
  pruneImages,
};
