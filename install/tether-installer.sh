#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
    echo ""
    echo "== Tether - Friend Beta Testing Version! =="
    echo ""
    echo "Node.js 20 or newer is needed and was not found."
    echo "Install it with your package manager, or get it from https://nodejs.org"
    echo ""
    read -r -p "Press Enter to close."
    exit 1
fi

node index.mjs "$@"
echo ""
read -r -p "Press Enter to close."
