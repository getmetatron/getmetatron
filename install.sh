#!/bin/sh
# Metatron Installer
# Installs Metatron as a global tool using uv.
# Website: https://getmetatron.com
# Repository: https://github.com/kerbelp/metatron

set -eu

# Color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    printf "${BLUE}info:${NC} %s\n" "$1"
}

success() {
    printf "${GREEN}success:${NC} %s\n" "$1"
}

error() {
    printf "${RED}error:${NC} %s\n" "$1" >&2
}

# Check if uv is installed
if ! command -v uv >/dev/null 2>&1; then
    info "uv is not installed. Installing uv first..."
    if ! curl -LsSf https://astral.sh/uv/install.sh | sh; then
        error "Failed to install uv. Please install it manually: https://docs.astral.sh/uv/"
        exit 1
    fi
    # Add uv to the current path for the rest of the script execution
    export PATH="$HOME/.local/bin:$PATH"
fi

# Double check if uv is now available
if ! command -v uv >/dev/null 2>&1; then
    error "uv was installed but is not in the current shell's PATH."
    error "Please add \$HOME/.local/bin to your PATH and run the installation again."
    exit 1
fi
info "Installing Metatron from PyPI..."
if ! uv tool install getmetatron; then
    error "Failed to install Metatron. Ensure you have internet access and Python 3.12+ is supported."
    exit 1
fi

success "Metatron installed successfully!"
success "Run 'metatron --help' to get started."

# Verify if ~/.local/bin is in the user's PATH
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
    info "Note: '$HOME/.local/bin' is not in your PATH."
    info "You may need to add it to your shell profile (e.g., ~/.zshrc or ~/.bashrc):"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi
