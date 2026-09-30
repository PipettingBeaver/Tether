#!/usr/bin/env bash
set -euo pipefail

VENV="${VENV:-$HOME/PipettingBeaver_Github/Vencord}"
PNPM="${PNPM:-$HOME/.local/bin/pnpm}"

git -C "$VENV" pull --ff-only
"$PNPM" -C "$VENV" install --frozen-lockfile
"$PNPM" -C "$VENV" build

echo "Vencord rebuilt. Fully restart Vesktop to load the update."
