#!/bin/bash

# Install GitHub CLI on macOS

echo "Installing GitHub CLI..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew first..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install GitHub CLI
brew install gh

# Authenticate with GitHub
echo "GitHub CLI installed. Now authenticate:"
gh auth login

# Create repository
echo "Creating repository..."
gh repo create posture-ai-unified --private --source=. --remote=origin --push

echo "Done! Repository created and code pushed."