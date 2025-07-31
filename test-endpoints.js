import fetch from "node-fetch";

const BASE_URL = "https://marketing-backend-mklg.onrender.com";

async function testHealthEndpoint() {
  console.log("🔍 Testing Health Endpoint...");
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log("✅ Health check response:", data);
    console.log("Status:", response.status);
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
  }
}

async function testChatEndpoint() {
  console.log("\n🔍 Testing Chat Endpoint...");

  const testMessages = [
    "Hello, how are you?",
    "This is a test message",
    "Can you help me with something?",
  ];

  for (const message of testMessages) {
    try {
      console.log(`\n📤 Sending message: "${message}"`);

      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          sessionId: Date.now().toString(),
        }),
      });

      const data = await response.json();
      console.log("📥 Response status:", response.status);
      console.log("📥 Response data:", data);

      if (!response.ok) {
        console.log(
          "⚠️  Request failed but this might be expected if webhook is not configured"
        );
      }
    } catch (error) {
      console.error("❌ Chat request failed:", error.message);
    }
  }
}

async function testInvalidRequests() {
  console.log("\n🔍 Testing Invalid Requests...");

  // Test without message
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    console.log(
      "✅ Empty message test - Status:",
      response.status,
      "Response:",
      data
    );
  } catch (error) {
    console.error("❌ Empty message test failed:", error.message);
  }

  // Test with very long message
  try {
    const longMessage = "A".repeat(1001);
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: longMessage }),
    });
    const data = await response.json();
    console.log(
      "✅ Long message test - Status:",
      response.status,
      "Response:",
      data
    );
  } catch (error) {
    console.error("❌ Long message test failed:", error.message);
  }

  // Test 404 endpoint
  try {
    const response = await fetch(`${BASE_URL}/nonexistent`);
    const data = await response.json();
    console.log("✅ 404 test - Status:", response.status, "Response:", data);
  } catch (error) {
    console.error("❌ 404 test failed:", error.message);
  }
}

async function runAllTests() {
  console.log("🚀 Starting API Tests...\n");

  await testHealthEndpoint();
  await testChatEndpoint();
  await testInvalidRequests();

  console.log("\n✨ All tests completed!");
}

runAllTests().catch(console.error);
