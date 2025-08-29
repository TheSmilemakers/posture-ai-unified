#!/bin/bash

# Push existing repository to GitHub
# Replace YOUR_USERNAME with your actual GitHub username

echo "Pushing posture-ai-unified to GitHub..."

# Add remote origin (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/posture-ai-unified.git

# Verify remote was added
echo "Remote added:"
git remote -v

# Push to main branch
git branch -M main
git push -u origin main

echo "Repository pushed successfully!"
echo "Next steps:"
echo "1. Go to https://github.com/YOUR_USERNAME/posture-ai-unified"
echo "2. Install CodeRabbit: https://github.com/apps/coderabbitai"
echo "3. Select your repository when installing"