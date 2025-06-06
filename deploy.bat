@echo off
echo 🚀 Deploying BESS Calculator fixes for AWS Amplify...

echo 🔧 Installing dependencies to fix React version conflict...
npm install

echo 🏗️ Testing build locally...
npm run build
if errorlevel 1 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)
echo ✅ Build successful!

REM Check if git is initialized
if not exist ".git" (
    echo 📝 Initializing Git repository...
    git init
)

REM Add all files
echo 📦 Adding files to Git...
git add .

REM Check git status
echo 📊 Current Git status:
git status

REM Prompt for commit message
echo.
set /p commit_message="✍️ Enter commit message (or press Enter for default): "

if "%commit_message%"=="" (
    set "commit_message=Fix: React version conflict and missing aws-exports for deployment"
)

REM Commit changes
echo 💾 Committing changes...
git commit -m "%commit_message%"

REM Check if remote origin exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo.
    set /p repo_url="🔗 Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): "
    git remote add origin "%repo_url%"
) else (
    echo ✅ Remote origin already configured:
    git remote get-url origin
)

REM Push to GitHub
echo 📤 Pushing to GitHub...
git push -u origin main

echo.
echo ✅ Deployment fixes pushed to GitHub successfully!
echo 🔄 AWS Amplify will automatically redeploy your app.
echo.
echo 📋 What was fixed:
echo - ✅ React version conflict resolved (downgraded to React 18.2.0)
echo - ✅ Missing aws-exports.js created with environment variable support
echo - ✅ Added graceful fallback when backend is not configured
echo - ✅ Shareable links now work with or without backend
echo.
echo 🌟 Next steps:
echo 1. Monitor your Amplify deployment at: https://console.aws.amazon.com/amplify/
echo 2. Test your app after deployment completes
echo 3. Optional: Set up backend following AWS_AMPLIFY_SETUP.md
echo.
echo 📚 Important files for reference:
echo - DEPLOYMENT_FIX.md: Details about fixes applied
echo - AWS_AMPLIFY_SETUP.md: Full backend setup guide
echo.
echo 🎯 Your BESS Calculator should now deploy successfully!
echo.
pause 