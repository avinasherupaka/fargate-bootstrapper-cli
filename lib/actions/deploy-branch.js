/**
 * Branch Deploy action
 */

const DEPLOY_SCHEMA = require('@/schemas/deploy.schema');
const { getConfig, testing } = require('@/config');
const { to } = require('await-to-js');
const { requestOptions } = require('@/modules/options');
const { getBranch } = require('@/modules/git');
const { checkEnvironment } = require('@/util');
const { buildDockerContainer, tagContainer } = require('@/modules/docker');
const { createTagsFile, createParamsFile } = require('@/util');
const {
  assumeRole,
  getHostedZone,
  getLoadBalancer,
  configureDNS,
  createECR,
  publishToECR,
  loginECR,
  createApplicationStack,
  deleteUntaggedImages,
} = require('@/modules/aws');

const Stepper = require('@/classes/Stepper');

const steps = [
  'Assuming Role',
  'Building Docker Container',
  'Configuring Elastic Container Registry',
  'Tagging Container',
  'Publishing Docker container to AWS Elastic Container Registry',
  'Removing Untagged images from ECR ( Cleanup Operation )',
  'Deploying CloudFormation Stack',
  'Configuring Route53 DNS Entry',
];

async function ACTION_DEPLOY_BRANCH(branchArg) {
  checkEnvironment();

  const terminal = new Stepper(steps, { scope: 'AWS CloudFormation [Branch] Deployment', disabled: testing });
  const [reqError, response] = await to(requestOptions(DEPLOY_SCHEMA));

  let BRANCH_NAME = branchArg;

  /* istanbul ignore else */
  if (!branchArg) {
    const [branchError, _BRANCH_NAME] = await to(getBranch());

    /* istanbul ignore else */
    if (branchError && !branchArg) {
      terminal.fail(branchError);
      return process.exit(1);
    }

    BRANCH_NAME = _BRANCH_NAME;
  }

  const {
    ProjectName,
    RoleARN,
    FargateAccountId,
    EnvironmentVariables,
  } = await getConfig();

  /* istanbul ignore else */
  if (reqError) {
    terminal.fail(reqError);
    return process.exit(1);
  }


  // Assume role. 'Logs' in as Role ARN
  terminal.next(`Assuming Role: ${RoleARN}`);
  const [assumeRoleError] = await to(assumeRole(RoleARN));

  /* istanbul ignore else */
  if (assumeRoleError) {
    terminal.fail(assumeRoleError);
    return process.exit(1);
  }

  // Build docker container
  terminal.next(`Building Docker Container: spectrum/${ProjectName}:${BRANCH_NAME}`);

  const [dockerError] = await to(buildDockerContainer(ProjectName, BRANCH_NAME));

  /* istanbul ignore else */
  if (dockerError) {
    terminal.fail(dockerError);
    return process.exit(1);
  }

  // Create ECR
  terminal.next();

  const [createECRError] = await to(createECR(ProjectName));

  /* istanbul ignore else */
  if (createECRError) {
    terminal.fail(createECRError);
    return process.exit(1);
  }

  // Tag container with branch identifiers
  terminal.next(`Tagging Container ${ProjectName} with Branch: ${BRANCH_NAME}`);

  const [tagError] = await to(tagContainer(ProjectName, FargateAccountId, BRANCH_NAME));

  /* istanbul ignore else */
  if (tagError) {
    terminal.fail(tagError);
    return process.exit(1);
  }

  // Publish container to ECR
  terminal.next(`Publishing Container: spectrum/${ProjectName}:${BRANCH_NAME} -> ${FargateAccountId}.dkr.ecr.us-east-1.amazonaws.com/${ProjectName}:${BRANCH_NAME}`);

  const [loginError] = await to(loginECR());

  /* istanbul ignore else */
  if (loginError) {
    terminal.fail(loginError);
    return process.exit(1);
  }

  const [publishError] = await to(publishToECR(ProjectName, FargateAccountId, BRANCH_NAME));

  /* istanbul ignore else */
  if (publishError) {
    terminal.fail(publishError);
    return process.exit(1);
  }


  // Cleanup action for ECR
  terminal.next();

  const [delImagesError] = await to(deleteUntaggedImages(ProjectName));

  if (delImagesError) {
    console.warn('Warning: Failed to cleanup untagged images from ECR. You may need to clean it up yourself.\n', delImagesError);
  }


  // Deploy CloudFormation app stack
  terminal.next(`Deploying CloudFormation Application Stack: ${ProjectName}-${BRANCH_NAME}`);

  await createTagsFile({
    projectName: `${ProjectName}-${BRANCH_NAME}`,
  });
  await createParamsFile({
    environmentVariables: EnvironmentVariables[response.environment],
    projectName: `${ProjectName}-${BRANCH_NAME}`,
    tag: BRANCH_NAME,
  });

  const [cloudFormationError] = await to(createApplicationStack(`${ProjectName}-${BRANCH_NAME}`));

  /* istanbul ignore else */
  if (cloudFormationError) {
    terminal.fail(cloudFormationError);
    return process.exit(1);
  }

  // Creates Route32 DNS record
  terminal.next();
  // let's first get the hosted zone ( contains base DNS domain to add to our app )
  const [hostedZoneError, hostedZone] = await to(getHostedZone());

  /* istanbul ignore else */
  if (hostedZoneError) {
    terminal.fail(hostedZoneError);
    return process.exit(1);
  }

  // let's grab the load balancer so we'll know the ID to assign to our record alias
  const [loadBalancerError, loadBalancer] = await to(getLoadBalancer());

  /* istanbul ignore else */
  if (loadBalancerError) {
    terminal.fail(loadBalancerError);
    return process.exit(1);
  }

  const DNS_RECORD_ENTRY = {
    action: 'CREATE',
    zoneId: hostedZone.id,
    loadBalancerId: loadBalancer.id,
    loadBalancerDomain: `${loadBalancer.domain}.`,
    name: `${ProjectName}-${BRANCH_NAME}.${hostedZone.domain}`,
  };

  const [dnsError] = await to(configureDNS(DNS_RECORD_ENTRY));

  /* istanbul ignore else */
  if (dnsError) {
    terminal.fail(dnsError);
    return process.exit(1);
  }


  return terminal.complete();
}

module.exports = ACTION_DEPLOY_BRANCH;
