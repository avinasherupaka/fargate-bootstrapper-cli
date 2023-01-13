
  

# Spectrum CLI

  

The Spectrum CLI is an interactive tool that enables developers and CI Servers to deploy applications to AWS Fargate with almost no configuration.

  

# Installation

Once installed, you will have access to the `spectrum` command.

  

# Commands

  

## `init`

**This command needs to be ran once. A project must be initialized first in order to use spectrum**

Example: `spectrum init`

Initializes the project directory for deployments. This will create the necessary configuration files that CloudFormation needs to configure and deploy your application.
After initialization, a `spectrum.config.json` file will be created in the project's root. It is safe to commit this file to git, for there are no sensitive credentials stored.

## `apps`

Example: `spectrum apps`  

Displays a listing of all application stacks deployed by Spectrum.
*Note: If there are applications were deployed manually outside of  Spectrum, then they will not display when running this command.*

## `describe <app>`

Example: `spectrum describe spectrum-proxy-60f5bf1e-8038-48cc-9b6c-532fb61cc757`

This will output CloudFormation details for the stack specified.


## `deploy-app`

Example: `spectrum deploy-app` 

When ran from your project's directory, spectrum will automatically read from a `.env` file as well as exported Environment Variables. If none of the required env variables are set, spectrum will provide a prompt asking for the needed variables. Environment variables to be used by the application will be used by the `spectrum.config.json` file.

## `deploy-branch [branch]`

Example: `spectrum deploy-branch`
Options: `branch` - Defaults to the current git branch

Similar to the `deploy-app` command, but will deploy the application as a branch. Useful for quickly deploying an app change into a live environment.

## `destroy-app`

Example: `spectrum destroy-app`

Deletes the CloudFormation stack, all ECR containers as well as its repository, and the Route53 DNS entry.
  
## `destroy-branch [branch]`

Example: `spectrum destroy-branch`
Options: `branch` - Defaults to the current git branch

Deletes the CloudFormation stack for the specified branch, the ECR Container tag matching the branch, and its Route53 DNS entry.

## Flags

  

`--ci` - Enables Continuous Integration mode. If running on a CI server, the required environment variables must be set. If not, spectrum will exit with an error code with a message indicating the env variables it needs.

`--prune-docker-images` - Cleans up any unused docker containers that may have accumulated on the local workstation.

  

## Environment Variables

  

Below are the environment variables used by spectrum. This is a useful reference to know what variables could be set.

  

`ENVIRONMENT` - Which environment to use for deployment. Found in `spectrum.config.json`. Also uses Env variables for that environment

  

`AWS_ACCESS_KEY` - AWS Access key for API

  

`AWS_SECRET_ACCESS_KEY` - AWS Secret access key

  

# TODO:

  


- Module loader for custom CLI actions

- Provide a packaged bundle for Gigabit internet and TV
