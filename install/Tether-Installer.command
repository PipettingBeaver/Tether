#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js was not found. Install it from https://nodejs.org and run this again."
    read -r -p "Press Enter to close."
    exit 1
fi

node index.mjs "$@"
read -r -p "Press Enter to close."
