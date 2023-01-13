const { getBranch } = require('@/modules/git');
const { shell } = require('execa');

const MOCK_GIT_BRANCH_OUTPUT = `
master
test
* development`;

jest.mock('execa');

describe('GIT Module', () => {
  beforeEach(() => {
    shell.mockResolvedValue({ stdout: '', stderr: '' });
    process.exit = jest.fn();
  });
  describe('getBranch()', () => {
    it('Should exit if there is a problem with Git', async () => {
      shell.mockRejectedValue(new Error('Shell Error'));
      await getBranch();
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    it('Should return the current git branch', async () => {
      shell.mockResolvedValue({ stdout: MOCK_GIT_BRANCH_OUTPUT });
      const result = await getBranch();

      expect(result).toBe('development');
    });
    it('Should return master as a default if no output is provided by git', async () => {
      shell.mockResolvedValue({ stdout: '' });
      const result = await getBranch();

      expect(result).toBe('master');
    });
  });
});
