/**
 * DESTROY BRANCH APP ACTION
 */

const { to } = require('await-to-js');
const { getConfig, testing } = require('@/config');
const { checkEnvironment } = require('@/util');
const { getBranch } = require('@/modules/git');
const {
  assumeRole,
  getHostedZone,
  getLoadBalancer,
  configureDNS,
  listApps,
  destroyStack,
  deleteContainerImageTag,
} = require('@/modules/aws');

const Stepper = require('@/classes/Stepper');

const steps = [
  'Assuming Role',
  'Deleting Application Stack',
  'Deleting Application Container from ECR',
  'Removing Route53 DNS Entry',
];

async function ACTION_DESTROY_BRANCH(branchArg) {
  checkEnvironment();

  const BRANCH_NAME = !branchArg ? await getBranch() : branchArg;
  const terminal = new Stepper(steps, { scope: 'AWS CloudFormation [Branch] Destroy', disabled: testing });

  const {
    ProjectName,
    RoleARN,
    FargateAccountId,
  } = await getConfig();

  // Assume role
  terminal.next(`Assuming Role: ${RoleARN}`);

  const [assumeRoleError] = await to(assumeRole(RoleARN));

  /* istanbul ignore else */
  if (assumeRoleError) {
    terminal.fail(assumeRoleError);
    return process.exit(1);
  }

  const APP_NAME = `${ProjectName}-${BRANCH_NAME}`;

  // Delete Stack
  terminal.next(`Deleting application stack: ${APP_NAME}`);

  const [listAppsError, stackList] = await to(listApps(APP_NAME));

  /* istanbul ignore else */
  if (listAppsError) {
    terminal.fail(listAppsError);
    return process.exit(1);
  }

  const STACK_NAME = stackList[0];

  const [destroyStackError] = await to(destroyStack(STACK_NAME));

  /* istanbul ignore else */
  if (destroyStackError) {
    console.warn('There was an issue deleting the stack. It was probably rolled back. Continuing.');
  }

  // Delete Container from ECR
  terminal.next(`Deleting Container Image: ${FargateAccountId}.dkr.ecr.us-east-1.amazonaws.com/${ProjectName}:${BRANCH_NAME}`);

  const [deleteImageError] = await to(deleteContainerImageTag(ProjectName, BRANCH_NAME));

  /* istanbul ignore else */
  if (deleteImageError) {
    terminal.fail(deleteImageError);
    return process.exit(1);
  }

  // Remove Route53 DNS Entry

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
    action: 'DELETE',
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

module.exports = ACTION_DESTROY_BRANCH;
