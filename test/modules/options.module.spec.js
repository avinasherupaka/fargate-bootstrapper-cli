const { requestOptions } = require('@/modules/options');
const { to } = require('await-to-js');
const { generatePrompt } = require('@/util');
const inquirer = require('inquirer');

jest.mock('inquirer', () => ({
  prompt: jest.fn().mockImplementation(() => Promise.resolve())
}));

jest.mock('@/util');

const OPTIONS = {
  environment: {
    default: 'development',
    type: 'string',
    message: 'Which environment would you like to deploy to? [ Assigned to NODE_ENV ]',
    environmentVariable: 'TEST_ENV',
  }
};

const _orgExit = process.exit;

describe('Options Module', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    generatePrompt.mockReturnValue([{environment: 'development'}]);
    process.exit = jest.fn();
  });
  afterEach(() => {
    process.exit = _orgExit;
    delete process.env.CI;
    delete process.env.TEST_ENV;
  });
  describe('requestOptions()', () => {
    it('Should exit if --ci flag is passed without required environment variables set', async () => {
      process.env.CI = true;

      await requestOptions(OPTIONS);

      expect(process.exit).toHaveBeenCalledWith(1);
    });
    it('Should return a Promise resolve if --ci flag is passed with environment variables set', async () => {
      process.env.TEST_ENV = 'development';
      process.env.CI = true;

      const [ err, response ] = await to ( requestOptions(OPTIONS) );

      expect(err).toBeFalsy();
      expect(response).toHaveProperty('environment');
      expect(response.environment).toBe('development');
    });
    it('Should return a promise rejection if no options are provided', async () => {
      const [ err, response ] = await to ( requestOptions() );

      expect(err).not.toBeFalsy();
      expect(err).toBeInstanceOf(Error);
      expect(response).toBeFalsy();
    });
    it('Should return a promise rejection if a problem with inquirer lib happens ', async () => {
      inquirer.prompt.mockRejectedValue(new Error('Inquirer Error'));

      const [ err, response ] = await to ( requestOptions(OPTIONS) );

      expect(err).toBeInstanceOf(Error);
      expect(response).toBeFalsy();
    });
    it('Should return response when finished asking questions', async () => {
      inquirer.prompt.mockResolvedValue({ environment: 'development' });

      const [ err, response ] = await to ( requestOptions(OPTIONS) );

      expect(err).toBeFalsy();
      expect(response).toHaveProperty('environment');
      expect(response.environment).toBe('development');
    });
  });
});
