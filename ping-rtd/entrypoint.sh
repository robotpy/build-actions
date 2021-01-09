#!/bin/sh
# Originally from wei/curl, MIT license

set -e

sh -c "curl --silent --show-error --fail $*"