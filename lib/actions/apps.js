/**
 * APPS ACTION
 * @description Displays a listing of applications deployed by Spectrum
 */

const { to } = require('await-to-js');
const { getConfig } = require('@/config');
const { checkEnvironment } = require('@/util');
const { assumeRole, listApps } = require('@/modules/aws');
const chalk = require('chalk');

async function ACTION_APPS() {
  checkEnvironment();

  console.info(chalk.yellow('Fetching application stacks deployed by Spectrum:\n'));

  const { RoleARN } = await getConfig();

  const [assumeRoleError] = await to(assumeRole(RoleARN));

  /* istanbul ignore else */
  if (assumeRoleError) {
    console.error(assumeRoleError);
    return process.exit(1);
  }

  const [listAppsError, appList] = await to(listApps());

  /* istanbul ignore else */
  if (listAppsError) {
    console.error(listAppsError);
    return process.exit(1);
  }

  return console.info(chalk.cyan(appList.join('\n')));
}

module.exports = ACTION_APPS;
