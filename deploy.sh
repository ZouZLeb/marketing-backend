#!/bin/bash

echo "🚀 Chatbot Backend Deployment Script"
echo "====================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the chatbot-backend directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Setting up Git repository..."
if [ ! -d ".git" ]; then
    git init
    git add .
    git commit -m "Initial commit: Chatbot backend proxy"
    echo "✅ Git repository initialized"
else
    echo "ℹ️  Git repository already exists"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Create a new GitHub repository at https://github.com/new"
echo "2. Make it PUBLIC (required for free Render tier)"
echo "3. Run these commands:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. Go to https://render.com and create a new Web Service"
echo "5. Connect your GitHub repository"
echo "6. Set environment variables in Render dashboard:"
echo "   - WEBHOOK_JWT=your_jwt_here"
echo "   - WEBHOOK_URL=your_webhook_url"
echo "   - ALLOWED_ORIGIN=*"
echo "   - NODE_ENV=production"
echo ""
echo "7. Update your frontend to use: https://your-app-name.onrender.com/api/chat"
echo ""
echo "📚 See README.md for detailed instructions" 