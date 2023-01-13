const { getConfig } = require('@/config');

const DEPLOY_ACTION_SCHEMA = {
  environment: {
    default: process.env.ENVIRONMENT,
    type: 'list',
    message: 'Which environment variable group would you like to use? [ Assigned from spectrum.config.json ]',
    choices: async () => {
      const { EnvironmentVariables } = await getConfig();
      return Object.keys(EnvironmentVariables);
    },
    environmentVariable: 'ENVIRONMENT',
  },
  AWS_ACCESS_KEY_ID: {
    default: process.env.AWS_ACCESS_KEY_ID,
    type: 'string',
    message: 'What is your AWS_ACCESS_KEY_ID?',
    environmentVariable: 'AWS_ACCESS_KEY_ID',
  },
  AWS_SECRET_ACCESS_KEY: {
    default: process.env.AWS_SECRET_ACCESS_KEY,
    type: 'password',
    message: 'What is your AWS_SECRET_ACCESS_KEY?',
    environmentVariable: 'AWS_SECRET_ACCESS_KEY',
  },
};

module.exports = DEPLOY_ACTION_SCHEMA;
