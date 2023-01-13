/**
 * AWS Module
 * @description Interfaces with AWS CLI / SDK, provides an abstraction layer
 */

const uuid = require('uuid/v4');
const execa = require('execa');
const chalk = require('chalk');
const { to } = require('await-to-js');
const { FARGATE_REGION } = require('@/env');
const { writeToSpectrumDirectory } = require('@/util/helpers');
const { readFileSync } = require('fs');
const { join } = require('path');

/**
 * @function loginECR
 * @description Logs into AWS ECR to provide basic auth credentials for Docker
 */
async function loginECR() {
  return new Promise(async (resolve, reject) => {
    const LOGIN_COMMAND = `aws ecr get-login --no-include-email --region ${FARGATE_REGION}`;

    const [shellError, result] = await to(execa.shell(LOGIN_COMMAND));

    /* istanbul ignore else */
    if (shellError) {
      return reject(shellError);
    }

    const output = result.stdout;
    const elements = output.split(' ');
    const token = elements[5];
    const url = elements[6];
    const DOCKER_LOGIN_COMMAND = `docker login -u AWS -p ${token} ${url}`;

    const [dockerLoginError] = await to(execa.shell(DOCKER_LOGIN_COMMAND));

    if (dockerLoginError) {
      return reject(dockerLoginError);
    }

    return resolve(result);
  });
}

/**
  * @function assumeRole
  * @description Assumes the role of a provided Role ARN
  * @param {String} arn Amazon Resource Name for role to assume
  */
async function assumeRole(arn) {
  return new Promise(async (resolve, reject) => {
    /* istanbul ignore else */
    if (!arn) return reject(new Error('ARN of role is requred'));

    /* istanbul ignore else */
    if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY) {
      return reject(new Error('AWS Credentials required in Environment Variable'));
    }

    const ASSUME_ROLE_COMMAND = `aws sts assume-role --role-arn ${arn} --role-session-name 'fargate-deployment'`;

    const [shellError, data] = await to(execa.shell(ASSUME_ROLE_COMMAND));

    /* istanbul ignore else */
    if (shellError) return reject(shellError);

    const credentials = JSON.parse(data.stdout).Credentials;

    // Assigns our role credentials to env variable
    process.env.AWS_SESSION_TOKEN = credentials.SessionToken;
    process.env.AWS_ACCESS_KEY_ID = credentials.AccessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = credentials.SecretAccessKey;
    process.env.AWS_DEFAULT_REGION = FARGATE_REGION;

    return resolve(credentials);
  });
}

/**
 * @function createECR
 * @description Creates a repository in AWS ECR
 * @param {String} appName Application Name
 */
async function createECR(appName) {
  return new Promise(async (resolve, reject) => {
    /* istanbul ignore else */
    if (!appName) {
      return reject(new Error('Application name is required to create ECR'));
    }

    const CREATE_REPOSITORY_COMMAND = `aws ecr create-repository --repository-name ${appName} --region ${FARGATE_REGION}`;

    const [ecrCreateError, data] = await to(execa.shell(CREATE_REPOSITORY_COMMAND));

    /* istanbul ignore else */
    if (ecrCreateError) {
      // Don't reject if the error indicates that the repo already exists
      if (!ecrCreateError.message.includes('RepositoryAlreadyExistsException')) {
        return reject(ecrCreateError);
      }
    }

    return resolve(data);
  });
}

/**
 * @function publishToECR
 * @description Publishes local docker container to AWS ECR
 * @param {String} appName Application Name
 * @param {String} fargateAccountId AWS Fargate ID
 * @param {String} tag Docker container tag [default=latest]
 */
async function publishToECR(appName, fargateAccountId, tag = 'latest') {
  return new Promise(async (resolve, reject) => {
    /* istanbul ignore else */
    if (!appName) return reject(new Error('Container name is required'));

    /* istanbul ignore else */
    if (!fargateAccountId) return reject(new Error('Fargate Account ID is required'));

    const DOCKER_PUBLISH_COMMAND = `docker push ${fargateAccountId}.dkr.ecr.us-east-1.amazonaws.com/${appName}:${tag}`;

    const [shellError, result] = await to(execa.shell(DOCKER_PUBLISH_COMMAND));

    /* istanbul ignore else */
    if (shellError) {
      return reject(shellError);
    }

    return resolve(result);
  });
}

/**
 * @function createApplicationStack
 * @description Creates an Application stack via CloudFormation in AWS
 * @param {String} appName Application Name
 */
async function createApplicationStack(appName) {
  return new Promise(async (resolve, reject) => {
    /* istanbul ignore else */
    if (!appName) {
      return reject(new Error('Application name is required for CloudFormation deployment'));
    }
    const UUID = uuid();
    const CREATE_STACK_COMMAND = `aws cloudformation create-stack --stack-name ${appName}-${UUID} --capabilities CAPABILITY_IAM --region ${FARGATE_REGION} --template-body file://./.spectrum/fargate-application.yml --parameters file://./.spectrum/app-parameters.json --tags file://./.spectrum/tags.json`;

    const [createStackError, result] = await to(execa.shell(CREATE_STACK_COMMAND));

    /* istanbul ignore else */
    if (createStackError) {
      return reject(createStackError);
    }

    return resolve(result);
  });
}

async function listApps(appFilter) {
  return new Promise(async (resolve, reject) => {
    const DESCRIBE_STACKS_COMMAND = 'aws cloudformation describe-stacks';
    const [listAppsError, result] = await to(execa.shell(DESCRIBE_STACKS_COMMAND));

    /* istanbul ignore else */
    if (listAppsError) {
      return reject(listAppsError);
    }

    // return resolve(result.stdout);

    const { stdout } = result;
    const list = JSON.parse(stdout).Stacks;

    const displayAll = (stackList) => {
      return stackList.reduce((acc, current) => {
        const fullList = acc;
        current.Tags.forEach((tag) => {
          if (tag.Key === 'spectrum:deployment' && current.StackStatus === 'CREATE_COMPLETE') {
            /* istanbul ignore else */
            fullList.push(current.StackName);
          }
          if (tag.Key === 'spectrum:deployment' && current.StackStatus === 'CREATE_IN_PROGRESS') {
            /* istanbul ignore else */
            fullList.push(`${chalk.green('[ DEPLOYING ]')} ${current.StackName}`);
          }
          if (tag.Key === 'spectrum:deployment' && current.StackStatus === 'DELETE_IN_PROGRESS') {
            /* istanbul ignore else */
            fullList.push(`${chalk.red('[ DELETING ]')} ${current.StackName}`);
          }
        });

        return fullList;
      }, []);
    };

    const displayFiltered = (stackList) => {
      return stackList.reduce((acc, current) => {
        const fullList = acc;
        current.Tags.forEach((tag) => {
          if (tag.Key === 'mon:project' && tag.Value === appFilter && (current.StackStatus === 'CREATE_COMPLETE' || current.StackStatus === 'CREATE_IN_PROGRESS')) {
            /* istanbul ignore else */
            fullList.push(current.StackName);
          }
        });

        return fullList;
      }, []);
    };

    const output = appFilter ? displayFiltered(list) : displayAll(list);

    return resolve(output);
  });
}

/**
 * @function getHostedZone
 * @description Leverages AWS Route53 to return the hosted zone of ARN account
 */
async function getHostedZone() {
  return new Promise(async (resolve, reject) => {
    const GET_HOSTED_ZONE_COMMAND = 'aws route53 list-hosted-zones';
    const [shellError, result] = await to(execa.shell(GET_HOSTED_ZONE_COMMAND));

    /* istanbul ignore else */
    if (shellError) {
      return reject(shellError);
    }
    const zone = JSON.parse(result.stdout).HostedZones[0];

    return resolve({
      id: zone.Id.split('/').slice(-1)[0],
      domain: zone.Name,
    });
  });
}

/**
 * @function getLoadBalancer
 * @description Returns the first Load Balancer in use by current ARN
 */
async function getLoadBalancer() {
  return new Promise(async (resolve, reject) => {
    const DESCRIBE_LOAD_BALANCERS_COMMAND = 'aws elbv2 describe-load-balancers';
    const [err, result] = await to(execa.shell(DESCRIBE_LOAD_BALANCERS_COMMAND));

    /* istanbul ignore else */
    if (err) {
      return reject(err);
    }

    const loadBalancer = JSON.parse(result.stdout).LoadBalancers[0];

    return resolve({
      id: loadBalancer.CanonicalHostedZoneId,
      domain: loadBalancer.DNSName,
    });
  });
}

async function configureDNS({ zoneId, loadBalancerDomain, name, loadBalancerId, action = 'CREATE' } = {}) {
  return new Promise(async (resolve, reject) => {
    /* istanbul ignore else */
    if (!zoneId || !loadBalancerDomain || !loadBalancerId || !name) {
      return reject(new Error('Missing properties: zoneId, zoneDNS, and/or name'));
    }

    const ROUTE_53_COMMAND = `aws route53 change-resource-record-sets --hosted-zone-id ${zoneId} --change-batch file://./.spectrum/dns-record.json`;
    const DNS_RECORD_TEMPLATE = readFileSync(join(__dirname, '../../templates/route53_record_entry.json')).toString();
    const DNS_RECORD_FILE = DNS_RECORD_TEMPLATE
      .replace('__ACTION__', action.toUpperCase())
      .replace('__LOAD_BALANCER_ID__', loadBalancerId)
      .replace('__ALIAS_DNS_NAME__', loadBalancerDomain)
      .replace('__NAME__', name);

    const [writeError] = await to(writeToSpectrumDirectory('dns-record.json', DNS_RECORD_FILE));

    /* istanbul ignore else */
    if (writeError) {
      return reject(writeError);
    }

    const [shellError, result] = await to(execa.shell(ROUTE_53_COMMAND));

    /* istanbul ignore else */
    if (shellError) {
      /* istanbul ignore else */
      if (!shellError.message.includes('already exists') && !shellError.message.includes('it was not found')) {
        return reject(shellError);
      }
    }

    return resolve(result);
  });
}

/**
 * @function describeStack
 * @description Lists information about a deployed CloudFormation Stack
 * @param {String} stackName CloudFormation Stack Name
 */
async function describeStack(stackName) {
  return new Promise(async (resolve, reject) => {
    const DESCRIBE_STACK_COMMAND = `aws cloudformation describe-stacks --stack-name ${stackName}`;
    /* istanbul ignore else */
    if (!stackName) {
      return reject(new Error('Stack Name not provided'));
    }

    const [shellError, result] = await to(execa.shell(DESCRIBE_STACK_COMMAND));

    /* istanbul ignore else */
    if (shellError) {
      return reject(shellError);
    }

    return resolve(result);
  });
}

/**
 * @function destroyStack,
 * @description Deletes a CloudFormation application stack
 * @param {String} stackName CloudFormation Stack Name
 */
async function destroyStack(stackName) {
  return new Promise(async (resolve, reject) => {
    const DESTROY_STACK_COMMAND = `aws cloudformation delete-stack --stack-name ${stackName}`;
    /* istanbul ignore else */
    if (!stackName) {
      return reject(new Error('Stack name not provided'));
    }

    const [shellError, result] = await to(execa.shell(DESTROY_STACK_COMMAND));

    /* istanbul ignore else */
    if (shellError) {
      return reject(shellError);
    }

    return resolve(result);
  });
}

/**
 * @function destroyContainerRepository,
 * @description Deletes a repo and its images in ECR
 * @param {String} repoName ECR Repository Name
 */
async function destroyContainerRepository(repoName) {
  return new Promise(async (resolve, reject) => {
    const DESTROY_REPO_COMMAND = `aws ecr delete-repository --force --repository-name ${repoName}`;

    /* istanbul ignore else */
    if (!repoName) {
      return reject(new Error('Repository name not provided'));
    }

    const [shellError, result] = await to(execa.shell(DESTROY_REPO_COMMAND));

    /* istanbul ignore else */
    if (shellError) {
      return reject(shellError);
    }

    return resolve(result);
  });
}

/**
 * @function deleteUntaggedImages
 * @description Removes all unused images in the ECR
 * @param {String} repoName ECR Repository Name
 */
async function deleteUntaggedImages(repoName) {
  return new Promise(async (resolve, reject) => {
    const LIST_IMAGES_COMMAND = `aws ecr list-images --repository-name ${repoName} --filter tagStatus=UNTAGGED --query 'imageIds[*]' --output json`;
    const BATCH_DELETE_COMMAND = images => `aws ecr batch-delete-image --repository-name ${repoName} --image-ids '${JSON.stringify(images)}' || true`;
    /* istanbul ignore else */
    if (!repoName) {
      return reject(new Error('Repository name not specified'));
    }

    const [listImagesError, imagesResult] = await to(execa.shell(LIST_IMAGES_COMMAND));

    /* istanbul ignore else */
    if (listImagesError) {
      return reject(listImagesError);
    }

    const images = JSON.parse(imagesResult.stdout);

    const [
      batchDeleteError,
      batchDeleteResult,
    ] = await to(execa.shell(BATCH_DELETE_COMMAND(images)));

    /* istanbul ignore else */
    if (batchDeleteError) {
      return reject(batchDeleteError);
    }

    return resolve(batchDeleteResult);
  });
}

/**
 * @function deleteContainerImageTag
 * @param {String} repoName ECR Repository Name
 * @param {*} tag Repository Tag name
 */
async function deleteContainerImageTag(repoName, tag) {
  return new Promise(async (resolve, reject) => {
    const REMOVE_TAG_COMMAND = `aws ecr batch-delete-image --repository-name ${repoName} --image-ids imageTag=${tag}`;
    if (!repoName) return reject(new Error('Repository name was not provided'));
    if (!tag) return reject(new Error('Image tag was not provided'));

    const [shellError, result] = await to(execa.shell(REMOVE_TAG_COMMAND));

    /* istanbul ignore else */
    if (shellError) {
      return reject(shellError);
    }

    return resolve(result);
  });
}


module.exports = {
  assumeRole,
  createECR,
  publishToECR,
  loginECR,
  createApplicationStack,
  listApps,
  getHostedZone,
  getLoadBalancer,
  configureDNS,
  describeStack,
  destroyStack,
  destroyContainerRepository,
  deleteUntaggedImages,
  deleteContainerImageTag,
};
