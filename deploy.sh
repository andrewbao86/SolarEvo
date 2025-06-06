#!/bin/bash

# BESS Calculator Deployment Preparation Script
echo "🚀 Preparing BESS Calculator for AWS Amplify deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
fi

# Add all files
echo "📦 Adding files to Git..."
git add .

# Check git status
echo "📊 Current Git status:"
git status

# Prompt for commit message
echo "✍️ Enter commit message (or press Enter for default):"
read commit_message

if [ -z "$commit_message" ]; then
    commit_message="Deploy: BESS Calculator with shareable links and backend integration"
fi

# Commit changes
echo "💾 Committing changes..."
git commit -m "$commit_message"

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Enter your GitHub repository URL (e.g., https://github.com/username/repo.git):"
    read repo_url
    git remote add origin "$repo_url"
else
    echo "✅ Remote origin already configured:"
    git remote get-url origin
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

echo "✅ Code pushed to GitHub successfully!"
echo ""
echo "🌟 Next steps:"
echo "1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/"
echo "2. Create new app and connect to your GitHub repository"
echo "3. Follow the detailed instructions in AWS_AMPLIFY_SETUP.md"
echo ""
echo "📚 Important files to review:"
echo "- AWS_AMPLIFY_SETUP.md: Complete setup guide"
echo "- amplify.yml: Build configuration"
echo "- src/graphql/operations.js: GraphQL operations"
echo ""
echo "🎯 Your BESS Calculator is ready for AWS Amplify deployment!" 