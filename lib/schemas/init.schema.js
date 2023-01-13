const { userInfo } = require('os');

const INIT_ACTION_SCHEMA = {
  ProjectName: {
    message: 'What is the name of this project?',
    default: process.cwd().split('/').slice(-1)[0],
    required: true,
    type: 'string',
  },
  FargateAccountId: {
    message: 'What is your Fargate Account ID? [ Provided by CloudOps ]',
    type: 'string',
    required: true,
  },
  FargateStackName: {
    message: 'What is your Fargate Stack Name? [ Provided by CloudOps ]',
    required: true,
    type: 'string',
  },
  FargateRegion: {
    message: 'What is your Fargate AWS Region?',
    default: 'us-east-1',
    required: true,
    type: 'string',
  },
  CostCenter: {
    message: 'What is the Cost Center? [ Provided by CloudOps ]',
    required: true,
    type: 'string',
  },
  AssumeRoleName: {
    message: 'What is the IAM Role to assume for interaction with AWS? [ Must be created in AWS ]',
    required: true,
    default: 'spectrum-role',
    type: 'string',
  },
  HealthCheckPath: {
    message: 'What is your application HealthCheckPath? AWS will check this path to see if the app is running.',
    default: '/',
    type: 'string',
  },
  ProjectOwner: {
    message: 'Who owns this project? This can be anyone. It will not affect the deployments',
    type: 'string',
    required: true,
    default: userInfo().username,
  },
};

module.exports = INIT_ACTION_SCHEMA;
