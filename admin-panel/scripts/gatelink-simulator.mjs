import http from "http";
import { createHash } from "crypto";

const PORT = parseInt(process.env.SIMULATOR_PORT || "8088", 10);

// Hardware state
const hardwareState = {
  deviceCode: "RCBFB58391-386A94B3",
  online: true,
  signal: 88,
  network: "4G-LTE / Wi-Fi",
  inputs: [true, true, false], // IN1: Upper Limit, IN2: Lower Limit, IN3: Safety OK
  outputs: [false, false, false, false], // Relay 1 (Raise), Relay 2 (Lower), Relay 3 (Stop), Relay 4 (Aux)
  cycleCount: 24,
  lastCommand: null,
  history: [],
};

function formatTime() {
  return new Date().toLocaleTimeString();
}

function verifySignature(resource, secret, expires, expectedSig) {
  const source = `resource=${resource}&accessKeySecret=${secret}&expires=${expires}`;
  const computed = createHash("sha1").update(source, "utf8").digest("hex");
  return computed.toLowerCase() === expectedSig.toLowerCase();
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, apiToken, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let parsedBody = {};
    if (body) {
      try {
        parsedBody = JSON.parse(body);
      } catch {}
    }

    const sendJson = (statusCode, obj) => {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj, null, 2));
    };

    // 1. Health check
    if (pathname === "/health" || pathname === "/") {
      return sendJson(200, {
        status: "ok",
        service: "GateLink RC200 Hardware Simulator",
        state: hardwareState,
      });
    }

    // 2. GateLink OpenAPI: Device Login
    if (pathname === "/wireless/openapi/device/login" && req.method === "POST") {
      const { accessKeyId, signature, expires, deviceCode } = parsedBody;

      console.log(`\n\x1b[36m[${formatTime()}] 🔑 LOGIN REQUEST\x1b[0m`);
      console.log(`  Device Code: \x1b[33m${deviceCode || "Unknown"}\x1b[0m`);
      console.log(`  AccessKeyId: ${accessKeyId || "N/A"}`);
      console.log(`  Signature:   ${signature || "N/A"}`);

      const token = `sim-token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      return sendJson(200, {
        code: 200,
        success: true,
        message: "Login successful",
        data: { token },
      });
    }

    // 3. GateLink OpenAPI: Device Details / Telemetry
    if (pathname === "/wireless/openapi/manage/device/details" && req.method === "GET") {
      const apiToken = req.headers["apitoken"] || req.headers["apiToken"];

      if (!apiToken) {
        return sendJson(401, { code: 401, success: false, message: "Missing apiToken header" });
      }

      return sendJson(200, {
        code: 200,
        success: true,
        data: {
          netWork: {
            online: hardwareState.online,
            network: hardwareState.network,
            wifiName: "GateLink_Secured_WiFi",
            signal: hardwareState.signal,
          },
          stateVo: {
            in: hardwareState.inputs,
            out: hardwareState.outputs,
          },
        },
      });
    }

    // 4. GateLink OpenAPI: Relay Pulse Control
    if (pathname === "/wireless/openapi/manage/device/control/relay" && req.method === "POST") {
      const apiToken = req.headers["apitoken"] || req.headers["apiToken"];
      const { relay, act } = parsedBody;

      if (!apiToken) {
        return sendJson(401, { code: 401, success: false, message: "Missing apiToken header" });
      }

      if (![1, 2, 3, 4].includes(relay)) {
        return sendJson(400, { code: 400, success: false, message: `Invalid relay index: ${relay}` });
      }

      const relayIndex = relay - 1;
      const relayName =
        relay === 1 ? "RAISE (Relay 1)" : relay === 2 ? "LOWER (Relay 2)" : relay === 3 ? "STOP (Relay 3)" : "AUX (Relay 4)";

      // Energize relay output
      hardwareState.outputs[relayIndex] = true;
      hardwareState.lastCommand = { relay, name: relayName, timestamp: new Date().toISOString() };
      hardwareState.history.unshift(`[${formatTime()}] ${relayName} energized`);
      if (hardwareState.history.length > 20) hardwareState.history.pop();

      console.log(`\n\x1b[32m[${formatTime()}] ⚡ RELAY PULSED: ${relayName}\x1b[0m`);
      console.log(`  Act: ${act || 1} | Relay State: [${hardwareState.outputs.map((v) => (v ? "CLOSED" : "OPEN")).join(", ")}]`);

      // De-energize dry contact after 500ms pulse duration (matching physical RC200 dry relay)
      setTimeout(() => {
        hardwareState.outputs[relayIndex] = false;
        console.log(`\x1b[90m[${formatTime()}] 🔌 ${relayName} returned to STANDBY (Dry contact opened)\x1b[0m`);
      }, 500);

      if (relay === 1) hardwareState.cycleCount += 1;

      return sendJson(200, {
        code: 200,
        success: true,
        message: `${relayName} pulsed successfully`,
        data: {},
      });
    }

    return sendJson(404, { code: 404, success: false, message: "Endpoint not found on simulator" });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\x1b[35m=====================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m✔ GateLink RC200 Hardware Simulator is Running!\x1b[0m`);
  console.log(`\x1b[35m=====================================================\x1b[0m`);
  console.log(`📡 Listening on: \x1b[33mhttp://127.0.0.1:${PORT}\x1b[0m`);
  console.log(`📋 Emulating Jutai Cloud OpenAPI endpoints:`);
  console.log(`   • POST /wireless/openapi/device/login`);
  console.log(`   • GET  /wireless/openapi/manage/device/details`);
  console.log(`   • POST /wireless/openapi/manage/device/control/relay`);
  console.log(`\n💡 To point admin-panel to this simulator, add to .env.local:`);
  console.log(`   GATELINK_BASE_URL=http://127.0.0.1:${PORT}`);
  console.log(`\nReady for incoming commands... (Press Ctrl+C to stop)`);
});
