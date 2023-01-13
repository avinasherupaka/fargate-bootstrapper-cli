#!/usr/bin/env node

/**
 * SPECTRUM CLI
 * @description A CLI utility to configure, manage, and deploy application environments
 */
require('module-alias/register');
require('dotenv').config();

const { checkVersion } = require('@/util');
const { pruneImages } = require('@/modules/docker');
const chalk = require('chalk');
const cli = require('commander');
const ACTION_INIT = require('@/actions/init');
const ACTION_APPS = require('@/actions/apps');
const ACTION_DEPLOY_APP = require('@/actions/deploy-app');
const ACTION_DEPLOY_BRANCH = require('@/actions/deploy-branch');
const ACTION_DESCRIBE = require('@/actions/describe');
const ACTION_DESTROY_BRANCH = require('@/actions/destroy-branch');
const ACTION_DESTROY_APP = require('@/actions/destroy-app');

process.on('beforeExit', () => checkVersion());

cli
  .version((require('./package.json').version))
  .option('-C, --ci', 'Enables Spectrum to run within a Continuous Integration environment ( Disables prompts )')
  .option('--prune-docker-images', 'Cleans up unused docker containers stored locally');

cli
  .command('init')
  .description(chalk.yellow('Initializes the project directory to be used by Spectrum'))
  .action(ACTION_INIT);

cli
  .command('apps')
  .description(chalk.yellow('Displays a listing of apps deployed by Spectrum'))
  .action(ACTION_APPS);

cli
  .command('describe <app>')
  .description(chalk.yellow('Displays information about a deployed app'))
  .action(ACTION_DESCRIBE);

cli
  .command('deploy-app')
  .description(chalk.yellow('Deploys an app to AWS Fargate'))
  .action(ACTION_DEPLOY_APP);

cli
  .command('deploy-branch [branch]')
  .description(chalk.yellow('Quickly deploy a live environment to test app changes - Defaults to current Git Branch'))
  .action(ACTION_DEPLOY_BRANCH);

cli
  .command('destroy-app')
  .description(chalk.yellow('Deletes app from AWS Fargate'))
  .action(ACTION_DESTROY_APP);

cli
  .command('destroy-branch [branch]')
  .description(chalk.yellow('Deletes app branch deployment from AWS Fargate - Defaults to current Git Branch'))
  .action(ACTION_DESTROY_BRANCH);

cli.on('option:ci', () => {
  console.info(chalk.blue('\n\n[ Continuous Integration Mode Enabled ]\n\n'));
  process.env.CI = true;
});

cli.on('option:prune-docker-images', () => {
  process.on('beforeExit', async () => {
    if (process.env.SPECTRUM_PRUNE_DOCKER) return;
    process.env.SPECTRUM_PRUNE_DOCKER = true;
    console.info(chalk.yellow('Removing unused docker images'));
    await pruneImages();
  });
});

cli.parse(process.argv);

if (!process.argv.slice(2).length) {
  cli.outputHelp();
}
