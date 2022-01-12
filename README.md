# Azure DevOps Extension - Boards - IT Research and Prototyping Roadmaps

[![Development](https://github.com/sara-sabr/rp-azuredevops-roadmaps/actions/workflows/development.yml/badge.svg)](https://github.com/sara-sabr/rp-azuredevops-roadmaps/actions/workflows/development.yml)
[![Production](https://github.com/sara-sabr/rp-azuredevops-roadmapsactions/workflows/production.yml/badge.svg)](https://github.com/sara-sabr/rp-azuredevops-roadmaps/actions/workflows/production.yml)

This Azure Boards extension provides roadmap capability for Epic > Feature > PBI.

## End User Project Configuration Requirements

### Create Required Shared Searches
1. Create Shared Search ```Automation\Roadmap\Latest```
   - Search Query ![Search Query Settings for Latest Status Report](/docs/roadmap-latest-query.png)
   - Click on Column Options and for Columns, choose the following:
      - ID
      - Work Item Type
      - Title
      - State
      - Assigned To
      - Start Date
      - Target Date
      - Parent
      - Area Path
      - Description
      - Iteration Path
   - Click on Column Options and for Sorting, choose the following:
       - Backlog Priority

## Developer Prerequisites

Download and install the following tools

1. [Visual Studio Code](https://code.visualstudio.com/download)
2. [Node LTS](https://nodejs.org/en/download/) (make sure its Node LTS - tested with Node 16)

> If you would prefer not to install the npm packages globally, you can add them to devDependencies in your `package.json` file and invoke them with scripts. You can use the [package.json](./package.json) in this repo as a template for scripts and to ensure you have the correct versions of packages in your extension.

## Instructions

### Setup dependencies

```
npm install
```

### Preparing to publish (Local and PROD)

1. Follow [instructions](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=azure-devops)
    - Acquire a Personal Access Token (PAT)

### Developing Locally

Once your ready to test, perform the following:

1. Publish the package to the marketplace. You will be prompted for your PAT.
   ```npm run publish:dev```.
2. Bring up the local environment.
   ```npm run start:dev```
3. Open MS Edge
    - No Debug: You can use your regular browser and access https://localhost:3000.
    - Debug: Use VS Code launch "Launch Edge" configuration.
4. In MS Edge, accept the self-signed certificate.
    - Make sure to accept the self-signed certificate in the launched browser if you are in debug mode as this is a different MS Edge environment.
5. Ensure you have installed your extension for your organization.
6. Browse to the project/organzation.

### Publishing Production

1. Publish the package to the marketplace. You will be prompted for your PAT.
   ```npm run publish```.

## Acknowledgements

This extension is based upon [Azure DevOps Extension Hot Reload and Debug
](https://github.com/microsoft/azure-devops-extension-hot-reload-and-debug) and [Azure DevOps Web Sample Extension
](https://github.com/microsoft/azure-devops-extension-sample).
