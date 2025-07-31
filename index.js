import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

// In-memory session store (use Redis in production)
const sessions = new Map();

// Session configuration
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS_PER_IP = 5;

// CORS and middleware setup
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "1mb" }));

// Session management functions
const generateSessionId = () => {
  return crypto.randomBytes(32).toString("hex");
};

const createSession = (ip) => {
  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    ip: ip,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    messages: [],
    userAgent: null,
  };

  sessions.set(sessionId, session);
  return sessionId;
};

const getSession = (sessionId, ip) => {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Security checks
  if (session.ip !== ip) {
    console.warn(`Session hijacking attempt: ${sessionId} from ${ip}`);
    return null;
  }

  if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
    sessions.delete(sessionId);
    return null;
  }

  session.lastActivity = Date.now();
  return session;
};

const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
    }
  }
};

// Cleanup expired sessions every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
  });
});

// Session creation endpoint
app.post("/api/session/create", (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  // Check if client has too many sessions
  const clientSessions = Array.from(sessions.values()).filter(
    (s) => s.ip === clientIP
  );
  if (clientSessions.length >= MAX_SESSIONS_PER_IP) {
    return res.status(429).json({
      error: "Too many active sessions. Please wait before creating a new one.",
    });
  }

  const sessionId = createSession(clientIP);
  res.json({
    sessionId,
    expiresIn: SESSION_TIMEOUT,
    message: "Session created successfully",
  });
});

// Main chat endpoint with session support
app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;

  // Validate input
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      error: "Message is required and must be a string",
    });
  }

  if (message.length > 1000) {
    return res.status(400).json({
      error: "Message too long (max 1000 characters)",
    });
  }

  // Session validation
  let session = null;
  if (sessionId) {
    session = getSession(sessionId, clientIP);
    if (!session) {
      return res.status(401).json({
        error: "Invalid or expired session. Please create a new session.",
      });
    }
  } else {
    // Create new session if none provided
    const newSessionId = createSession(clientIP);
    session = getSession(newSessionId, clientIP);
    res.setHeader("X-Session-ID", newSessionId);
  }

  // Add user message to session
  const userMessage = {
    id: Date.now().toString(),
    text: message,
    isUser: true,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMessage);

  try {
    console.log(
      `Processing message for session ${session.id}: ${message.substring(
        0,
        50
      )}...`
    );

    // Prepare context for webhook (last 10 messages for context)
    const recentMessages = session.messages.slice(-10);
    const conversationContext = recentMessages
      .map((msg) => `${msg.isUser ? "User" : "Bot"}: ${msg.text}`)
      .join("\n");

    const response = await fetch(process.env.WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WEBHOOK_JWT}`,
        "X-Proxy-Request": "true",
        "X-Session-ID": session.id,
        "X-Request-ID": `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      },
      body: JSON.stringify({
        message,
        sessionId: session.id,
        conversationContext,
        timestamp: new Date().toISOString(),
        proxy: true,
      }),
    });

    if (!response.ok) {
      console.error(`Webhook error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: `Webhook error: ${response.status}`,
      });
    }

    const data = await response.json();
    console.log("Webhook response received successfully");

    // Add bot response to session
    let responseText = "";
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      responseText = data[0].output;
    } else if (data.response) {
      responseText = data.response;
    } else {
      responseText =
        "I apologize, but I'm having trouble responding right now. Please try again.";
    }

    const botMessage = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      isUser: false,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(botMessage);

    // Return response with session info
    res.json({
      ...data,
      sessionId: session.id,
      messageCount: session.messages.length,
      sessionExpiresIn: SESSION_TIMEOUT - (Date.now() - session.lastActivity),
    });
  } catch (err) {
    console.error("Error forwarding to webhook:", err);
    res.status(500).json({
      error: "Failed to contact webhook service",
      details:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
});

// Session info endpoint
app.get("/api/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const clientIP = req.ip || req.connection.remoteAddress;

  const session = getSession(sessionId, clientIP);
  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  res.json({
    sessionId: session.id,
    messageCount: session.messages.length,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    expiresIn: SESSION_TIMEOUT - (Date.now() - session.lastActivity),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`🚀 Chatbot backend server running on port ${port}`);
  console.log(`📡 Webhook URL: ${process.env.WEBHOOK_URL || "Not configured"}`);
  console.log(`🔒 JWT configured: ${process.env.WEBHOOK_JWT ? "Yes" : "No"}`);
  console.log(`🌐 CORS origin: ${allowedOrigin}`);
  console.log(`🔑 Session secret: ${SESSION_SECRET.substring(0, 8)}...`);
});
