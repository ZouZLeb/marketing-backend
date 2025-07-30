# Chatbot Backend Proxy

A secure Node.js backend that proxies requests to your webhook with JWT authentication.

## Features

- 🔒 Secure JWT authentication
- 🛡️ Input validation and sanitization
- 🌐 CORS configuration
- 📊 Health check endpoint
- 🚀 Ready for deployment on Render

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on `env.example`:

```bash
cp env.example .env
```

3. Update the `.env` file with your actual values

4. Start the development server:

```bash
npm run dev
```

## Deployment on Render

### Step 1: Prepare Your Repository

1. Create a new GitHub repository
2. Push this backend code to the repository
3. Make sure your repository is public (for free Render tier)

### Step 2: Deploy on Render

1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New +" and select "Web Service"
3. Connect your GitHub account and select your repository
4. Configure the service:
   - **Name**: `chatbot-backend` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid if you prefer)

### Step 3: Set Environment Variables

In the Render dashboard, go to your service's "Environment" tab and add these variables:

- `WEBHOOK_JWT`: Your JWT token
- `WEBHOOK_URL`: Your webhook URL
- `ALLOWED_ORIGIN`: Your frontend domain (or `*` for development)
- `NODE_ENV`: `production`

### Step 4: Deploy

Click "Create Web Service" and wait for deployment to complete.

## API Endpoints

- `GET /health` - Health check
- `POST /api/chat` - Main chat endpoint

## Frontend Integration

Update your frontend to use the new backend URL:

```javascript
const response = await fetch("https://your-render-app.onrender.com/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: inputValue }),
});
```

## Security Notes

- Never commit your `.env` file to version control
- Set `ALLOWED_ORIGIN` to your actual frontend domain in production
- Rotate your JWT token regularly
- Monitor your Render logs for any issues
