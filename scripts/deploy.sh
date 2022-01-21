#!/bin/bash

# Get to the root project
SCRIPT_DIR=$(dirname "$(readlink "$BASH_SOURCE" || echo "$BASH_SOURCE")")
PROJECT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd -P)
export PROJECT_DIR

cd $PROJECT_DIR

NODEJS_VERSION=15

### Control that the script is run on `dev` branch
#branch=$(git rev-parse --abbrev-ref HEAD)
#if [[ ! "$branch" == "master" ]];
#then
#  echo ">> This script must be run under \`master\` branch"
#  exit 1
#fi


# Node JS
UNAME=$(uname)
echo "$UNAME"
export NVM_DIR="$HOME/.nvm"
if test -d "${NVM_DIR}"; then

    # Load NVM
    . "${NVM_DIR}/nvm.sh"

    # Switch to expected version
    nvm use ${NODEJS_VERSION}

    # Or install it
    if test $? -ne 0; then
        nvm install ${NODEJS_VERSION}
    fi
else
    echo "nvm (Node version manager) not installed (directory ${NVM_DIR} not found). Please install, and retry"
fi

nvm use ${NODEJS_VERSION}
[[ $? -ne 0 ]] && exit 1

### Get project name (package.json)
APP_NAME=$(node -e "console.log(require('./package.json')['name'])")
if [[ "_${APP_NAME}" == "_" ]]; then
  echo "Unable to read the project name in 'package.json'. Please check version format is: x.y.z (x and y should be an integer)."
  exit 1;
fi
echo "Starting to deploy '${APP_NAME}'..."

### Get current project version (package.json)
VERSION=$(node -e "console.log(require('./package.json')['version'])")
if [[ "_${VERSION}" == "_" ]]; then
  echo "Unable to read the current project version in 'package.json'. Please check version format is: x.y.z (x and y should be an integer)."
  exit 1;
fi
echo " - version: ${VERSION}"

# Override with a local file, if any
if [[ -f "${PROJECT_DIR}/.local/env.sh" ]]; then
  echo "Loading environment variables from: '.local/env.sh'"
  . ${PROJECT_DIR}/.local/env.sh
else
  echo "No file '${PROJECT_DIR}/.local/env.sh' found. Will use defaults"
fi

if [[ ! -d "node_modules" ]]; then
  yarn
  [[ $? -ne 0 ]] && exit 1
fi

# RUn the build
yarn run build
[[ $? -ne 0 ]] && exit 1

DIST_FILE="${APP_NAME}-v${VERSION}.zip"
DIST_ZIP="${PROJECT_DIR}/dist/${DIST_FILE}"
if [[ -f "${DIST_ZIP}" ]] && [[ "_${SERVER_HOST}" != "_" ]]; then
  echo "Deploying to remote server..."

  scp ${DIST_ZIP} ${SERVER_HOST}:/tmp
  [[ $? -ne 0 ]] && exit 1

  ssh ${SERVER_HOST} """unzip -o /tmp/${DIST_FILE} -d ${SERVER_DEPLOY_PATH}"""

  if [[ $? -ne 0 ]]; then
    rsync -az -e ssh ./public/ ${SERVER_HOST}:${SERVER_DEPLOY_PATH}
    [[ $? -ne 0 ]] && exit 1
  fi
fi;

