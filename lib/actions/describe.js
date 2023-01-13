/**
 * DESCRIBE ACTION
 * @description Displays information about a deployed app
 */

const { to } = require('await-to-js');
const { getConfig } = require('@/config');
const { checkEnvironment } = require('@/util');
const { assumeRole, describeStack } = require('@/modules/aws');
const chalk = require('chalk');

async function ACTION_DESCRIBE(app) {
  checkEnvironment();

  /* istanbul ignore else */
  if (!app) {
    console.warn('Missing argument: app');
    return process.exit(1);
  }

  console.info(chalk.yellow(`Fetching stack information for: ${app}\n`));

  const { RoleARN } = await getConfig();

  const [assumeRoleError] = await to(assumeRole(RoleARN));

  /* istanbul ignore else */
  if (assumeRoleError) {
    console.error(assumeRoleError);
    return process.exit(1);
  }

  const [describeError, stack] = await to(describeStack(app));

  /* istanbul ignore else */
  if (describeError) {
    console.error(describeError);
    return process.exit(1);
  }

  return console.info(stack.stdout);
}

module.exports = ACTION_DESCRIBE;
