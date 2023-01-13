const AWS_MODULE = require('@/modules/aws');
const {
  assumeRole,
  createECR,
  publishToECR,
  loginECR,
  createApplicationStack,
  listApps,
  getHostedZone,
  configureDNS,
  getLoadBalancer,
  describeStack,
  destroyStack,
  destroyContainerRepository,
  deleteUntaggedImages,
  deleteContainerImageTag,
} = require('@/modules/aws');
const { writeToSpectrumDirectory } = require('@/util/helpers');
const { to } = require('await-to-js');
const { readFileSync } = require('fs');
const execa = require('execa');

const CONTAINER_NAME = 'test_container';
const FARGATE_ID = 1024;
const DOCKER_REPO_NAME = 'test_app';
const ROLE_ARN = 'arn:aws:iam::1024:role/test-role';
const MOCK_SESSION_TOKEN = 'sessiontokenstring';
const MOCK_ACCESS_KEY_ID = 'ACCESS_KEY_ID';
const MOCK_SECRET_ACCESS_KEY = 'secretaccesskey';

const mockShellResponse = {
  "AssumedRoleUser": {
      "AssumedRoleId": "assumedrole:fargate-deployment",
      "Arn": ROLE_ARN
  },                                                                                                                       
  "Credentials": {
      "SecretAccessKey": MOCK_SECRET_ACCESS_KEY,
      "SessionToken": MOCK_SESSION_TOKEN,
      "Expiration": "2019-06-18T15:18:15Z",
      "AccessKeyId": MOCK_ACCESS_KEY_ID
  }
};

const configureDNSOpts = {
  zoneId: 1024,
  loadBalancerDomain: 'domain.ext.',
  name: 'test',
  loadBalancerId: 'lb1024',
};

const MOCK_STACK_NAME = 'TEST_STACK_1024';
const MOCK_REPO_NAME = 'spectrum-test';
const MOCK_LIST_APPS = require('./mock-output/list-apps.json');
const MOCK_HOSTED_ZONE = require('./mock-output/get-hosted-zones.json');
const MOCK_LOAD_BALNCERS = require('./mock-output/get-load-balancer.json');
const MOCK_LIST_REPO_IMAGES = require('./mock-output/list-repo-images.json');

jest.mock('execa');
jest.mock('@/util/helpers');
jest.mock('fs');

describe('AWS Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    execa.shell.mockResolvedValue({ stdout: '', stderr: '' });
    writeToSpectrumDirectory.mockResolvedValue({});
    readFileSync.mockReturnValue('');
    delete process.env.AWS_SESSION_TOKEN;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });
  describe('assumeRole()', () => {
    beforeEach(() => {
      process.env.AWS_ACCESS_KEY_ID = MOCK_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = MOCK_SECRET_ACCESS_KEY;
    });
    it('Should return a promise rejection if no AWS credentials are provided via env variable', async () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      const [ assumeRoleError, role ] = await to ( assumeRole(ROLE_ARN) );

      expect(assumeRoleError).toBeInstanceOf(Error);
      expect(role).toBeFalsy();
    });
    it('Should return a promise rejection if no ARN is provided', async () => {
      const [ assumeRoleError, role ] = await to ( assumeRole() );

      expect(assumeRoleError).toBeInstanceOf(Error);
      expect(role).toBeFalsy();
    });
    it('Should return a promise rejection if the shell process to assume role fails', async () => {
      execa.shell.mockRejectedValue(new Error('Shell exec error'));
      const [ assumeRoleError, role ] = await to ( assumeRole( ROLE_ARN ) );

      expect(assumeRoleError).toBeInstanceOf(Error);
      expect(role).toBeFalsy();
    });
    it('Should apply the AWS environment variables on successful shell execution', async () => {
      execa.shell.mockResolvedValue({ stdout: JSON.stringify(mockShellResponse), stderr: null });
      const [ assumeRoleError, role ] = await to ( assumeRole(ROLE_ARN) );


      expect(assumeRoleError).toBeFalsy();
      expect(process.env.AWS_SESSION_TOKEN).toBe(MOCK_SESSION_TOKEN);
      expect(process.env.AWS_ACCESS_KEY_ID).toBe(MOCK_ACCESS_KEY_ID);
      expect(process.env.AWS_SECRET_ACCESS_KEY).toBe(MOCK_SECRET_ACCESS_KEY);
      expect(role.AccessKeyId).toBe(MOCK_ACCESS_KEY_ID);
      expect(role.SecretAccessKey).toBe(MOCK_SECRET_ACCESS_KEY);
      expect(role.SessionToken).toBe(MOCK_SESSION_TOKEN);
    });
  });
  describe('createECR()', () => {
    it('Should return a promise rejection if no application name is provided', async () => {
      const [ repoError, data ] = await to ( createECR () );

      expect(repoError).toBeInstanceOf(Error);
      expect(repoError.message).toContain('Application name is required');
      expect(data).toBeFalsy();
    });
    it('Should return a promise rejection if the shell command to create ECR fails', async () => {
      execa.shell.mockRejectedValue(new Error('Shell exec error'));
      const [ repoError, data ] = await to ( createECR (DOCKER_REPO_NAME) );

      expect(repoError).toBeInstanceOf(Error);
      expect(repoError.message).toContain('Shell exec error');
      expect(data).toBeFalsy();
    });
    it('Should not return a promise rejection if RepositoryAlreadyExistsException occurs', async () => {
      execa.shell.mockRejectedValue(new Error('RepositoryAlreadyExistsException'));
      const [repoError, data] = await to ( createECR(DOCKER_REPO_NAME) );

      expect(repoError).toBeFalsy();
    });
    it('Should return a promise resolve if the shell command executes successfuly', async () => {
      const [ repoError ] = await to ( createECR (DOCKER_REPO_NAME) );

      expect(repoError).toBeFalsy();
    });
  });
  describe('publishToECR()', () => {
    it('Should return a promise rejection if an application name is not provided', async () => {
      const [ err ] = await to ( publishToECR() );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('name is required');
    });
    it('Should return a promise rejection if the Fargate Account ID is not provided', async () => {
      const [ err ] = await to ( publishToECR(CONTAINER_NAME) );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('ID is required');
    });
    it('Should return a promise rejection if the shell command to execute ECR publish fails', async () => {
      execa.shell.mockRejectedValue(new Error('Shell Error'));
      const [ err ] = await to ( publishToECR(CONTAINER_NAME, FARGATE_ID) );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Shell Error');
    });
    it('Should return a promise resolve with result of shell command to execute ECR publish', async () => {
      execa.shell.mockResolvedValue({ stderr: null, stdout: null });
      const [ err, result ] = await to ( publishToECR(CONTAINER_NAME, FARGATE_ID) );

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
  describe('loginECR()', () => {
    it('Should return a promise rejection if the shell command to authenticate to ECR fails', async () => {
      execa.shell.mockRejectedValue(new Error('Login Error'));

      const [ err ] = await to ( loginECR() );

      expect(err).not.toBeFalsy();
    });
    it('Should return a promise rejection if it fails to login into docker with ECR credentials', async () => {
      execa.shell.mockResolvedValueOnce({stdout: ''});
      execa.shell.mockRejectedValue(new Error('Docker Error'));

      const [ err ] = await to ( loginECR() );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Docker Error');
    });
    it('Should return a promise resolve if the shell command executes successfully', async () => {
      execa.shell.mockResolvedValue({ stderr: null, stdout: '' });

      const [ err, result ] = await to ( loginECR() );

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
  describe('createApplicationStack()', () => {
    it('Should return a promise rejection if an application name is not provided', async () => {
      const [ err ] = await to ( createApplicationStack() );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('name is required');
    });
    it('Should return a promise rejection if the shell command to execute CloudFormation command fails', async () => {
      execa.shell.mockRejectedValue(new Error('Shell Error'));
      const [ err ] = await to ( createApplicationStack(CONTAINER_NAME) );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Shell Error');
    });
    it('Should return a promise resolve if the CloudFormation command succeeds', async () => {
      execa.shell.mockResolvedValue({ stderr: null, stdout: null });
      const [ err, result ] = await to ( createApplicationStack(CONTAINER_NAME) );

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
  describe('listApps()', () => {
    it('Should return a Promise rejection if an error occurs with cloudformation command', async () => {
      execa.shell.mockRejectedValue(new Error('Shell Error'));
      const [listAppsError] = await to (listApps());

      expect(listAppsError).toBeInstanceOf(Error);
      expect(listAppsError.message).toContain('Shell Error');
    });
    it('Should return an array of listed applications', async () => {
      execa.shell.mockResolvedValue({stdout: JSON.stringify(MOCK_LIST_APPS)});
      const [listAppsError, result] = await to (listApps());

      expect(listAppsError).toBeFalsy();
      expect(result.length).toBe(3);
    });
    it('Should return an array of filtered results of "CREATE_COMPLETE" if a stack name is provided', async () => {
      const APP_NAME = 'spectrum-test-one';
      const STACK_NAME = 'c7-user-admin-poc-test-01-ekRWmLXFe5RDB';
      execa.shell.mockResolvedValue({ stdout: JSON.stringify(MOCK_LIST_APPS) });
      const [ listAppsError, result ] = await to (listApps(APP_NAME));

      expect(listAppsError).toBeFalsy();
      expect(result.length).toBe(1);
      expect(result[0]).toBe(STACK_NAME);
    });
    it('Should return an array of filterd results of "CREATE_IN_PROGRESS" if a stack name is provided', async () => {
      const APP_NAME = 'spectrum-test-two';
      const STACK_NAME = 'c7-user-admin-poc-test-02-ekRWmLXFe5RDB';
      execa.shell.mockResolvedValue({ stdout: JSON.stringify(MOCK_LIST_APPS) });
      const [ listAppsError, result ] = await to (listApps(APP_NAME));

      expect(listAppsError).toBeFalsy();
      expect(result.length).toBe(1);
      expect(result[0]).toBe(STACK_NAME);
    });
  });
  describe('getHostedZone()', () => {
    it('Should return a Promise rejection if the aws command fails', async () => {
      execa.shell.mockRejectedValue(new Error('HOSTED_ZONE_ERROR'));
      const [err] = await to (getHostedZone());

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('HOSTED_ZONE_ERROR');
    });
    it('Should return a Promise resolve with the hosted zone', async () => {
      execa.shell.mockResolvedValue({ stdout: JSON.stringify(MOCK_HOSTED_ZONE) });

      const [err, result] = await to (getHostedZone());

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('domain');
      expect(result.id).toBe('TEST_HOSTED_ZONE');
      expect(result.domain).toBe('123456789101.internal.organization.net.');
    });
  });
  describe('getLoadBalancer()', () => {
    it('Should return a promise rejection if the aws command fails', async () => {
      execa.shell.mockRejectedValue(new Error('LOAD_BALANCER_ERROR'));
      const [err] = await to (getLoadBalancer());
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('LOAD_BALANCER_ERROR');
    });
    it('Should return a promise resolve with an object containing LB ID and DNS Name', async () => {
      execa.shell.mockResolvedValue({ stdout: JSON.stringify(MOCK_LOAD_BALNCERS) });
      const [err, result] = await to (getLoadBalancer());

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('domain');
    });
  });
  describe('configureDNS()', () => {
    it('Should reject if missing props to configure DNS', async () => {
      const [err] = await to (configureDNS());

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Missing properties');
    });
    it('Should reject if there was a problem writing the dns-record.json file', async () => {
      writeToSpectrumDirectory.mockRejectedValue(new Error('WRITE ERROR'));
      const [ err ] = await to (configureDNS(configureDNSOpts));

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('WRITE ERROR');
    });
    it('Should reject if there was a problem running aws command to configure Route53', async () => {
      execa.shell.mockRejectedValue(new Error('SHELL ERROR'));

      const [ err ] = await to (configureDNS(configureDNSOpts));

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('SHELL ERROR');
    });
    it('Should create DNS entry file', async () => {
      readFileSync.mockReturnValue('{}');
      const [err, result] = await to (configureDNS(configureDNSOpts));

      expect(writeToSpectrumDirectory).toHaveBeenCalled();
      expect(err).toBeFalsy();
    });
  });
  describe('describeStack()', () => {
    it('Should reject if no stack name is provided', async () => {
      const [err] = await to (describeStack());

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Stack Name not provided');
    });
    it('Should reject if there was an issue running aws command', async () => {
      execa.shell.mockRejectedValue(new Error('DESCRIBE_STACK_SHELL_ERROR'));

      const [err] = await to (describeStack(MOCK_STACK_NAME));

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('DESCRIBE_STACK_SHELL_ERROR');
    });
    it('Should resolve when shell command completes successfully', async () => {
      execa.shell.mockResolvedValue({ stdout: 'success' });

      const [err, result] = await to (describeStack(MOCK_STACK_NAME));

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
  describe('destroyStack()', () => {
    it('Should reject if stack name is not provided', async () => {
      const [err] = await to(destroyStack());

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Stack name not provided');
    });
    it('Should reject if the aws command fails', async () => {
      execa.shell.mockRejectedValue(new Error('SHELL_ERROR'));

      const [err] = await to (destroyStack(MOCK_STACK_NAME));

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('SHELL_ERROR');
    });
    it('Should resolve with command completed successfully', async () => {
      const [err, result] = await to (destroyStack(MOCK_STACK_NAME));

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
  describe('destroyContainerRepository()', () => {
    it('Should reject if no repo name is specified', async () => {
      const [err] = await to (destroyContainerRepository());

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Repository name not provided');
    });
    it('Should reject if aws command fails', async () => {
      execa.shell.mockRejectedValue(new Error('SHELL_ERROR'));

      const [err] = await to (destroyContainerRepository(MOCK_REPO_NAME));
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('SHELL_ERROR');
    });
    it('Should resolve if aws command completes successfully', async () => {
      const [err, result] = await to (destroyContainerRepository(MOCK_REPO_NAME));

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
  describe('deleteUntaggedImages()', () => {
    it('Should reject if repo name is not specified', async () => {
      const [err] = await to (deleteUntaggedImages());

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Repository name not specified');
    });
    it('Should reject if it fails to list images', async () => {
      execa.shell.mockRejectedValue(new Error('LIST_IMAGES_ERROR'));

      const [err] = await to(deleteUntaggedImages(MOCK_REPO_NAME));

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('LIST_IMAGES_ERROR');
    });
    it('Should reject if it fails to execute batch delete command', async () => {
      execa.shell.mockResolvedValueOnce({ stdout: JSON.stringify(MOCK_LIST_REPO_IMAGES) });
      execa.shell.mockRejectedValue(new Error('BATCH_DELETE_FAILED'));

      const [err] = await to (deleteUntaggedImages(MOCK_REPO_NAME));

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('BATCH_DELETE_FAILED');
    });
    it('Should resolve if list and batch delete commands execute successfully', async () => {
      execa.shell.mockResolvedValueOnce({ stdout: JSON.stringify(MOCK_LIST_REPO_IMAGES) });
      const [err, result] = await to (deleteUntaggedImages(MOCK_REPO_NAME));

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
  describe('deleteContainerImageTag()', () => {
    it('Should reject if no repo name is specified', async () => {
      const [err] = await to (deleteContainerImageTag());

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Repository name was not provided');
    });
    it('Should reject if no image tag is specified', async () => {
      const [err] = await to (deleteContainerImageTag(MOCK_REPO_NAME));

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Image tag was not provided');
    });
    it('Should reject if aws command to remove container image tag fails', async () => {
      execa.shell.mockRejectedValue(new Error('IMAGE_TAG_SHELL_ERROR'));

      const [err] = await to (deleteContainerImageTag(MOCK_REPO_NAME, 'latest'));

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('IMAGE_TAG_SHELL_ERROR');
    });
    it('Should resolve if the aws command executes successfully', async () => {
      const [err, result] = await to (deleteContainerImageTag(MOCK_REPO_NAME, 'latest'));

      expect(err).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
});

