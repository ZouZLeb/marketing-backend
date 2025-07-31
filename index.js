import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

// CORS configuration
app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON bodies
app.use(express.json({ limit: "1mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;

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

  // Generate sessionId if not provided
  const finalSessionId = sessionId || Date.now().toString();

  try {
    console.log(`Processing message: ${message.substring(0, 50)}...`);

    const response = await fetch(process.env.WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WEBHOOK_JWT}`,
        "X-Proxy-Request": "true",
        "X-Request-ID": `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      },
      body: JSON.stringify({
        message,
        timestamp: new Date().toISOString(),
        sessionId: finalSessionId,
        requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        proxy: true,
      }),
    });

    console.log(
      `Webhook response status: ${response.status} ${response.statusText}`
    );
    console.log(
      `Webhook response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      console.error(`Webhook error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: `Webhook error: ${response.status}`,
      });
    }

    // Check if response has content
    const responseText = await response.text();
    console.log(`Webhook response body: "${responseText}"`);

    let data;
    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
        console.log("Webhook response parsed successfully");
      } catch (parseError) {
        console.error("Failed to parse webhook response as JSON:", parseError);
        return res.status(500).json({
          error: "Webhook returned invalid JSON",
          details:
            process.env.NODE_ENV === "development"
              ? responseText
              : "Invalid response format",
        });
      }
    } else {
      console.log("Webhook returned empty response");
      data = { message: "Webhook processed successfully" };
    }

    res.json(data);
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
});
