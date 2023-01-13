const { writeToSpectrumDirectory, parseEnvironmentVariablesForParams } = require('@/util/helpers.js');
const { checkEnvironment } = require('@/util');
const { readdirSync, readFileSync, mkdirSync, writeFileSync } = require('fs');

jest.mock('fs');
jest.mock('@/util');

const original_exit = process.exit;

describe('Utility Function helpers', () => {
  beforeEach(() => {
    checkEnvironment.mockReturnValue(true);
    readdirSync.mockReturnValue(['spectrum.config.json']);
    readFileSync.mockReturnValue({toString: jest.fn()})
    mkdirSync.mockReturnValue(true);
    process.exit = jest.fn();
  });
  afterEach(() => {
    process.exit = original_exit;
  })
  describe('writeToSpectrumDirectory()', () => {
    beforeEach(() => {
      readdirSync.mockReturnValueOnce(['.spectrum']);
    });
    it('Should not exit if the spectrum.config.json file exists', () => {
      readdirSync.mockReturnValueOnce('spectrum.config.json');
      expect(() => checkEnvironment()).toBeTruthy();
    });
    it('Should exit if the project was not initalizes', async () => {
      readdirSync.mockReturnValueOnce(['package.json']);
      await writeToSpectrumDirectory('test-file', 1024);

      expect(process.exit).toHaveBeenCalledWith(1);
    });
    it('Should write files to the .spectrum directory', async () => {
      readdirSync.mockReturnValueOnce(['.spectrum']);
      await writeToSpectrumDirectory('test-file.txt', 1024);

      expect(writeFileSync).toBeCalled();
    });
    it('Should create a .spectrum directory if it does not exist', async () => {
      readdirSync.mockReturnValueOnce(['.spectrum']);
      readdirSync.mockReturnValue([]);

      await writeToSpectrumDirectory('test-file.txt', 1024);

      expect(mkdirSync).toBeCalled();
    });
  });
  describe('parseEnvironmentVariablesForParams()', () => {
    it('Should return a JSON string to use for Fargate deployments', () => {
      const data = parseEnvironmentVariablesForParams();
      expect(data).toContain('PORT');
      expect(data).toContain('80');
    });
    it('Should add env variables provided as argument', async () => {
      const data = parseEnvironmentVariablesForParams({testVariable: 1024});
      expect(data).toContain('testVariable');
      expect(data).toContain(1024);
    });
  });
});
