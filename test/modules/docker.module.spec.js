const DockerModule = require('@/modules/docker');

const { buildDockerContainer, tagContainer, pruneImages } = DockerModule;
const { to } = require('await-to-js');
const { shell } = require('execa');

const CONTAINER_NAME = 'TEST_DOCKER_CONTAINER_NAME';
const ACCOUNT_ID = 1024;

jest.mock('execa');


describe('Docker Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    shell.mockResolvedValue({ stdout: '', stderr: null });
  });
  describe('buildDockerContainer()', () => {
    it('Fails if a container name is not specified as an argument', async () => {
      const NO_CONTAINER_NAME_ERROR = new Error('No Container Name Specified');

      const [ err, result ] = await to (buildDockerContainer());

      expect(err).toEqual(NO_CONTAINER_NAME_ERROR);
      expect(result).toBeFalsy();
    });
    it('Fails if an unspecified error occurs when executing docker shell command', async () => {
      const SHELL_ERROR = new Error('Failed to execute shell command');

      shell.mockRejectedValue(SHELL_ERROR);

      const [ error, result ] = await to ( buildDockerContainer(CONTAINER_NAME) );

      expect(error).toEqual(SHELL_ERROR);
      expect(result).toBeFalsy();
    });
    it('Resolves a Promise if the docker shell command succeeds', async () => {
      shell.mockResolvedValue({stdout: '', stderr: null});

      const [ error, result ] = await to ( buildDockerContainer(CONTAINER_NAME) );

      expect(error).toBeFalsy();
      expect(result).toHaveProperty('stdout');
      expect(result).toHaveProperty('stderr');
    });
  });
  describe('tagContainer()', () => {
    it('Should return a promise rejection if a container name is not provided', async () => {
      const [ tagError ] = await to (tagContainer());

      expect(tagError).toBeInstanceOf(Error);
      expect(tagError.message).toContain('Container name is required');
    });
    it('Should return a promise rejection if the Fargate Account ID is not provided', async () => {
      const [ tagError ] = await to (tagContainer(CONTAINER_NAME));

      expect(tagError).toBeInstanceOf(Error);
      expect(tagError.message).toContain('Fargate account ID is required');
    });
    it('Should return a promise rejection if the shell command to tag the container fails', async () => {
      shell.mockRejectedValue(new Error('Shell error'));
      const [ tagError ] = await to (tagContainer(CONTAINER_NAME, ACCOUNT_ID));

      expect(tagError).toBeInstanceOf(Error);
      expect(tagError.message).toContain('Shell error');
    });
    it('Should return a promise resolve with the result of the shell command executed', async () => {
      shell.mockResolvedValue({ stderr: null, stdout: null });
      const [ tagError, result ] = await to ( tagContainer(CONTAINER_NAME, ACCOUNT_ID) );

      expect(tagError).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
  describe('pruneImages()', () => {
    it('Should reject if the docker prune command fails', async () => {
      shell.mockRejectedValue(new Error('Prune Error'));
      const [pruneError] = await to ( pruneImages() );

      expect(pruneError).toBeInstanceOf(Error);
      expect(pruneError.message).toContain('Prune Error');
    });
    it('Should resolve when command executes successfully', async () => {
      const [ pruneError, result ] = await to ( pruneImages() );

      expect(pruneError).toBeFalsy();
      expect(result).toHaveProperty('stdout');
    });
  });
});
