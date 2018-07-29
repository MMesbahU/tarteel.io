#!/usr/bin/env bash

# exit on any failure
set -e


REPO=tarteel
PORT=4444
args+=(--restart=always --cpuset-cpus=6)

# stop and remove existing container
if [ -n "$(docker ps --all --quiet --filter name=^/${REPO}$)" ]; then
  docker stop ${REPO}
  docker rm ${REPO}
fi

# get APP_PATH (parent of config)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_PATH="$SCRIPT_DIR/"

# start container
set -x
args+=(
  --name=${REPO}
  --volume=${APP_PATH}:/app
  --workdir=/app
  --detach
  --publish 127.0.0.1:$PORT:8000
  --env TERM=xterm-256color
  --tty
  python:3
  /bin/sh -c "pip3 install -r requirements.txt && ./manage.py makemigrations && ./manage.py migrate && ./manage.py runserver 0.0.0.0:8000"
)
docker run "${args[@]}"

echo "started $REPO"
# container logs
docker logs --follow ${REPO}