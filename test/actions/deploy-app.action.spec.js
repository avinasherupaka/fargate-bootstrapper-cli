const DEPLOY_ACTION = require('@/actions/deploy-app');
const { buildDockerContainer, tagContainer } = require('@/modules/docker');
const { requestOptions } = require('@/modules/options');
const { assumeRole, createECR, publishToECR, loginECR, createApplicationStack, deleteUntaggedImages, getHostedZone, getLoadBalancer, configureDNS } = require('@/modules/aws');
const { getConfig } = require('@/config');
const { checkEnvironment } = require('@/util');

const MOCK_CONFIG = {
  ProjectName: 'Test_Project',
  RoleARN: 'aws:iam::test-role/role',
  FargateAccountId: '000000000',
  EnvironmentVariables: {}
};

jest.mock('@/config');
jest.mock('@/util');
jest.mock('@/modules/docker');
jest.mock('@/modules/options');
jest.mock('@/modules/aws');

const _originalExit = process.exit;

describe('Deploy App Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.exit = jest.fn();
    console.warn = jest.fn();
    getConfig.mockResolvedValue(MOCK_CONFIG);
    checkEnvironment.mockReturnValue(true);
    requestOptions.mockResolvedValue({});
    assumeRole.mockResolvedValue({});
    createECR.mockResolvedValue({});
    buildDockerContainer.mockResolvedValue({});
    publishToECR.mockResolvedValue({});
    tagContainer.mockResolvedValue({});
    loginECR.mockResolvedValue({});
    createApplicationStack.mockResolvedValue({});
    deleteUntaggedImages.mockResolvedValue({});
    getHostedZone.mockResolvedValue({});
    getLoadBalancer.mockResolvedValue({});
    configureDNS.mockResolvedValue({});
  });
  afterEach(() => {
    process.exit = _originalExit;
  });
  it('Should exit if there is a problem assuming ARN Role', async () => {
    process.exit = jest.fn();
    assumeRole.mockRejectedValue(new Error('Assume role error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should exit if there is a problem requesting options', async () => {
    process.exit = jest.fn();
    requestOptions.mockRejectedValue(new Error('Options Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it('Should build the application as a docker container', async () => {
    buildDockerContainer.mockResolvedValue();

    await DEPLOY_ACTION();

    expect(buildDockerContainer).toHaveBeenCalled();
  });
  it('Should exit if docker build fails', async () => {
    process.exit = jest.fn();
    buildDockerContainer.mockRejectedValue(new Error('DOCKER FAILURE'));

    await DEPLOY_ACTION();

    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it('Should exit if it fails to create ECR', async () => {
    process.exit = jest.fn();
    createECR.mockRejectedValue(new Error('ECR Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should exit if tagging docker container for publishing fails', async () => {
    process.exit = jest.fn();
    tagContainer.mockRejectedValue(new Error('Tag Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should exit if it fails to log into ECR', async () => {
    process.exit = jest.fn();
    loginECR.mockRejectedValue(new Error('Login Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should exit if publishing to ECR fails', async () => {
    process.exit = jest.fn();
    publishToECR.mockRejectedValue(new Error('ECR Publish Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should exit if the CloudFormation command fails', async () => {
    process.exit = jest.fn();
    createApplicationStack.mockRejectedValue(new Error('CloudFormation Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should provide a warning if it failed to delete untagged images', async () => {
    deleteUntaggedImages.mockRejectedValue(new Error('Untagged Images Error'));

    await DEPLOY_ACTION();

    expect(console.warn).toHaveBeenCalled();
  });
  it('Should exit on failure to get DNS hosted zone', async () => {
    getHostedZone.mockRejectedValue(new Error('Hosted Zone Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should exit if failure to get Application Load Balancer', async () => {
    getLoadBalancer.mockRejectedValue(new Error('Load Balancer Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should exit if failure to update DNS record for application', async () => {
    configureDNS.mockRejectedValue(new Error('DNS Config Error'));

    await DEPLOY_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
});
