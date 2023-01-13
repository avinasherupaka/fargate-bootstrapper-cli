/**
 * Init action
 * @description Scaffolds the project to use Spectrum
 */

const { to } = require('await-to-js');
const { requestOptions } = require('@/modules/options');
const { setConfig } = require('@/config');
const chalk = require('chalk');
const INIT_SCHEMA = require('@/schemas/init.schema');

const AWS_ROLE_PERMISSIONS = [
  'S3:*',
  'Lambda:*',
  'STS:*',
  'IAM:*',
  'Elastic Container Service (ECS:*)',
  'Elastic Container Registry (ECR:*)',
  'EC2:*',
  'ELB / ELB v2 (elasticloadbalancing:*)',
  'Route53 (route53:*)',
  'cloudtrail:*',
  'CloudWatch Logs (logs:*)',
  'CloudFormation (cloudformation:*)',
  'CloudWatch Events (events:*)',
  'CloudWatch (cloudwatch:*)',
  'Lightsail (lightsail:*)',
  'Resource Group Tagging (tag:*)',
];

async function INIT_ACTION() {
  const [inqError, response] = await to(requestOptions(INIT_SCHEMA));

  /* istanbul ignore else */
  if (inqError) {
    console.error('There was an error issuing prompt', inqError);
    return process.exit(1);
  }

  const {
    ProjectName,
    FargateStackName,
    FargateAccountId,
    FargateRegion,
    CostCenter,
    AssumeRoleName,
    ProjectOwner,
    HealthCheckPath,
  } = response;

  const FargateRoleARN = `arn:aws:iam::${FargateAccountId}:role/${AssumeRoleName}`;

  await setConfig({
    ProjectName,
    FargateAccountId,
    FargateStackName,
    FargateRegion,
    CostCenter,
    AssumeRoleName,
    HealthCheckPath,
    ProjectOwner,
    RoleARN: FargateRoleARN,
  });

  console.info(`\n\n\n${chalk.blue(ProjectName)} has been initialized!`);
  console.info('Here are some tips:\n');
  console.info(`You created the ${chalk.green(AssumeRoleName)} (${chalk.green(FargateRoleARN)}) role, so please make sure it is created in AWS and has the following permissions:\n`);
  console.info(chalk.blue(AWS_ROLE_PERMISSIONS.join('\n')));
  console.info(`\n\nWhen deploying, also make sure you have the ${chalk.red('AWS_ACCESS_KEY_ID')} and ${chalk.red('AWS_SECRET_ACCESS_KEY')} set. Otherwise, spectrum will ask and will fail if not provided\n\n`);
  console.info(`\nMake sure to commit your ${chalk.green('spectrum.config.json')} file so you don't have to reinitialize the project!\nHave a nice day! :)\n\n`);
}

module.exports = INIT_ACTION;
