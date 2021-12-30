# Azure DevOps Extension - Boards - IT Research and Prototyping Roadmaps

[![Development](https://github.com/sara-sabr/rp-azuredevops-common/actions/workflows/development.yml/badge.svg)](https://github.com/sara-sabr/AzBoards-QoL-Automation/actions/workflows/development.yml)
[![Production](https://github.com/sara-sabr/rp-azuredevops-common/actions/workflows/production.yml/badge.svg)](https://github.com/sara-sabr/AzBoards-QoL-Automation/actions/workflows/production.yml)

This Azure Boards extension provides roadmap capability for Epic > Feature > PBI.

## End User Project Configuration Requirements

### Create Required Shared Searches
1. Create Shared Search ```Automation\Status Report\Latest Status Report```
   - Search Query ![Search Query Settings for Latest Status Report](/docs/latest-status-report-query.png)
   - Click on Column Options and for Columns, choose the following:
      - ID
      - Work Item Type
      - Title
      - State
      - Assigned To
      - Start Date
      - Due Date
      - Finish Date
      - Description
      - Action
      - Risk
      - Priority
      - Parent
      - Area Path
   - Click on Column Options and for Sorting, choose the following:
       - ID

2. Create Shared Search ```Automation\Status Report\Impediments```
   - Search Query ![Search Query Settings for Impediments](/docs/impediments-query.png)
   - Click on Column Options and for Columns, choose the following:
      - ID
      - Work Item Type
      - Title
      - Assigned To
      - State
      - Parent
   - Click on Column Options and for Sorting, choose the following:
       - ID


## Developer Prerequisites

Download and install the following tools

1. [Visual Studio Code](https://code.visualstudio.com/download)
2. [Firefox](https://www.mozilla.org/firefox/) (because the VS Code Debugger for Chrome extension [doesn't support iframes](https://github.com/microsoft/vscode-chrome-debug/issues/786) yet)
3. [Node LTS](https://nodejs.org/en/download/) (make sure its Node LTS - tested with Node 16)
4. The [Debugger for Firefox](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-firefox-debug) VS Code extension
5. The [tfx-cli](https://www.npmjs.com/package/tfx-cli) npm package
6. The [webpack](https://www.npmjs.com/package/webpack) npm package
7. The [webpack-dev-server](https://www.npmjs.com/package/webpack-dev-server) npm package

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
3. Open Firefox
4. Ensure you have installed your extension for your organization.
5. Browse to the project/organzation.

### Publishing Production

1. Publish the package to the marketplace. You will be prompted for your PAT.
   ```npm run publish```.

## Acknowledgements

This extension is based upon [Azure DevOps Extension Hot Reload and Debug
](https://github.com/microsoft/azure-devops-extension-hot-reload-and-debug) and [Azure DevOps Web Sample Extension
](https://github.com/microsoft/azure-devops-extension-sample).
