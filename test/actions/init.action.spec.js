const INIT_ACTION = require('@/actions/init');
const { writeToSpectrumDirectory } = require('@/util/helpers');
const { requestOptions } = require('@/modules/options');
const { setConfig } = require('@/config');

jest.mock('@/util/helpers');
jest.mock('@/modules/options');
jest.mock('@/config');

const orig_exit = process.exit;

describe('Init Action', () => {
  beforeEach(() => {
    process.exit = orig_exit;
    requestOptions.mockResolvedValue({});
  });
  it('Should exit if there was an issue requesting options', async () => {
    process.exit = jest.fn();
    requestOptions.mockRejectedValue(new Error('inqError'));

    await INIT_ACTION();

    expect(process.exit).toBeCalledWith(1);
  });
  it('Should create spectrum.config.json file', async () => {
    await INIT_ACTION();

    expect(setConfig).toBeCalled();
  });
});
