const utils = require('@/util');
const { generatePrompt, checkEnvironment, createParamsFile, createTagsFile, checkVersion } = require('@/util');
const { writeToSpectrumDirectory, parseEnvironmentVariablesForParams } = require('@/util/helpers.js');
const { readdirSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const { getConfig } = require('@/config');

const checkForUpdate = require('update-check');

const TEST_SCHEMA = {
  env: {
    default: 'development',
    message: 'ENV?'
  }
}

const MOCK_CONFIG = {
  ProjectName: 'Test_Project',
  RoleARN: 'aws:iam::test-role/role',
  FargateAccountId: '000000000',
  EnvironmentVariables: {}
};

const original_exit = process.exit;
const original_info = console.info;
const original_warn = console.warn;

jest.mock('fs');
jest.mock('update-check');
jest.mock('@/util/helpers.js');
jest.mock('@/config');

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    readFileSync.mockReturnValue('');
    readdirSync.mockReturnValue(['spectrum.config.json']);
    writeToSpectrumDirectory.mockResolvedValue(true);
    parseEnvironmentVariablesForParams.mockReturnValue("");
    getConfig.mockResolvedValue(MOCK_CONFIG);
    checkForUpdate.mockResolvedValue({ update: { latest: '2.0.0' } });
  });
  describe('generatePrompt()', () => {
    it('Should throw error if no schema is provided', () => {
      expect(() => generatePrompt()).toThrow();
    });
    it('Should return an array of inquirer options', () => {
      const options = generatePrompt(TEST_SCHEMA);

      expect(options[0]).toHaveProperty('name');
      expect(options[0].name).toBe('env');
      expect(options[0].message).toBe('ENV?')
      expect(options[0].default).toBe('development');
    });
  });
  describe('checkEnvironment()', () => {
    beforeEach(() => {
      process.exit = jest.fn();
    });
    afterEach(() => {
      process.exit = original_exit;
    });
    it('Should exit if the environment is not initialized', () => {
      readdirSync.mockReturnValue([]);
      checkEnvironment();

      expect(process.exit).toBeCalledWith(1);
    });
    it('Should return true if a .spectrum directory is detected', () => {
      expect(checkEnvironment()).toBe(true);
    });
  });
  describe('createParamsFile()', () => {
    it('Should create a params file for CloudFormation deployment', async () => {
      readdirSync.mockReturnValue({toString: jest.fn()});
      await createParamsFile();

      expect(parseEnvironmentVariablesForParams).toHaveBeenCalled();
      expect(writeToSpectrumDirectory).toHaveBeenCalledWith('app-parameters.json', '');
    });
  });
  describe('createTagsFile()', () => {
    it('Should create a tags.json file for CloudFormation deployment', async () => {
      readdirSync.mockReturnValue({toString: jest.fn()});
      await createTagsFile();

      expect(writeToSpectrumDirectory).toHaveBeenCalledWith('tags.json', '');
    });
  });
  describe('checkVersion()', () => {
    beforeEach(() => {
      console.info = jest.fn();
      console.error = jest.fn();
    });
    afterEach(() => {
      console.info = original_info;
      console.error = original_warn;
      jest.clearAllMocks();
      jest.resetAllMocks();
      delete process.env.SPECTRUM_VERSION_CHECK;
    });
    it('Should provide a warning indicating that there was a failure to fetch update version', async () => {
      checkForUpdate.mockRejectedValue(new Error('Update Error'));
      await checkVersion();

      expect(console.error).toHaveBeenCalled();
    });
    it('Should provide a message indicating that an update is available', async () => {
      await checkVersion();

      expect(console.info).toHaveBeenCalled();
    });
    it('Should return if already ran update', async () => {
      process.env.SPECTRUM_VERSION_CHECK = true;

      await checkVersion();

      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
