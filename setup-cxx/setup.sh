#!/bin/sh
set -e

# Safeguard in case this accidentally runs on Windows or macOS.
if [ "$RUNNER_OS" != "Linux" ]; then
	echo "On $RUNNER_OS, doing nothing."
	exit
fi

sudo apt-get install --no-install-recommends g++-8 gcc-8

DIR="$RUNNER_TEMP/gcc-override"
mkdir "$DIR"
ln -s /usr/bin/gcc-8 "$DIR/gcc"
ln -s /usr/bin/g++-8 "$DIR/g++"
echo "$DIR" >>"$GITHUB_PATH"
