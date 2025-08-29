#!/bin/bash

# Quick push script after creating repository on GitHub

echo "Pushing to GitHub..."

# Add remote (using your GitHub username)
git remote add origin https://github.com/TheSmilemakers/posture-ai-unified.git

# Push all branches and tags
git push -u origin main

echo ""
echo "✅ Code pushed successfully!"
echo ""
echo "Next steps:"
echo "1. Visit: https://github.com/TheSmilemakers/posture-ai-unified"
echo "2. Install CodeRabbit: https://github.com/apps/coderabbitai"
echo "3. Select 'posture-ai-unified' repository during installation"
echo ""
echo "CodeRabbit will automatically detect your .coderabbit.yaml config!"