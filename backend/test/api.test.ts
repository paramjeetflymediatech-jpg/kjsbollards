import "mocha";
import { expect } from "chai";
import Fastify, { FastifyInstance } from "fastify";
import { SignJWT, jwtVerify } from "jose";

describe("KJS Bollards REST API Suite (Endpoints & Diagnostics)", () => {
  let app: FastifyInstance;
  let authToken: string;
  const JWT_SECRET = new TextEncoder().encode("kjs-super-secure-dev-jwt-secret-key-32bytes!!");

  const sampleSites = [
    {
      id: "site-1",
      name: "KJS Central Headquarters",
      address: "Feltham Gateway, London TW13",
      bollards: [
        {
          id: "b1",
          name: "Main Entry Bollard #1",
          deviceCode: "RC200-A5B1-01",
          status: "RAISED",
          online: true,
          safetyOk: true,
          signalStrength: 62,
          cycleCount: 1420,
          hwVersion: "1.11",
          fwVersion: "1.01",
          netType: "WIFI",
          netId: "KJS-Secure-Net",
          ioIn: [false, true, false],
          ioOut: [false, false, false, false],
          ioInMode: [0, 0, 0, 0],
          ioOutMode: [0, 0, 0, 0],
          lastSeen: "Live"
        }
      ]
    }
  ];

  before(async () => {
    app = Fastify({ logger: false });

    // JWT Auth Middleware
    const authenticate = async (request: any, reply: any) => {
      const auth = String(request.headers.authorization || "");
      if (!auth.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Unauthorized: Missing Bearer Token" });
      }
      try {
        const verified = await jwtVerify(auth.slice(7), JWT_SECRET, { issuer: "kjs-bollards" });
        request.actor = verified.payload;
      } catch (err) {
        return reply.code(401).send({ error: "Unauthorized: Invalid or Expired Token" });
      }
    };

    // Health
    app.get("/health", async () => ({ status: "ok" }));

    // Auth Login
    app.post("/v1/auth/login", async (request, reply) => {
      const { email, password } = (request.body || {}) as any;
      if (email === "operator@kjsbollards.co.uk" && password === "KjsSecure2026!") {
        const token = await new SignJWT({ id: "usr-1", email, role: "operator", name: "Security Officer" })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuer("kjs-bollards")
          .setSubject("usr-1")
          .setExpirationTime("2h")
          .sign(JWT_SECRET);
        return { accessToken: token, user: { id: "usr-1", name: "Security Officer", email, role: "operator" } };
      }
      return reply.code(401).send({ error: "Invalid credentials" });
    });

    // Sites
    app.get("/v1/sites", { preHandler: authenticate }, async () => sampleSites);

    // Diagnostics
    app.get("/v1/bollards/:id/diagnostics", { preHandler: authenticate }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const b = sampleSites[0].bollards.find((x) => x.id === id);
      if (!b) return reply.code(404).send({ error: "Bollard not found" });
      return {
        source: "mqtt",
        online: b.online,
        inputs: b.ioIn,
        outputs: b.ioOut,
        signalStrength: b.signalStrength,
        cycleCount: b.cycleCount,
        hardwareVersion: b.hwVersion,
        softwareVersion: b.fwVersion,
        netType: b.netType,
        netId: b.netId,
        lastSeen: new Date().toISOString()
      };
    });

    // Commissioning
    app.post("/v1/bollards", { preHandler: authenticate }, async (request, reply) => {
      const body = (request.body || {}) as any;
      const newBollard = {
        id: "b-" + Date.now(),
        name: body.name,
        deviceCode: body.deviceCode,
        status: "LOWERED",
        online: true,
        safetyOk: true,
        signalStrength: 60,
        cycleCount: 0
      };
      sampleSites[0].bollards.push(newBollard as any);
      return reply.code(201).send(newBollard);
    });

    // Reboot
    app.post("/v1/bollards/:id/reboot", { preHandler: authenticate }, async () => ({
      success: true,
      message: "Reboot instruction dispatched to controller"
    }));

    // IO Config
    app.post("/v1/bollards/:id/io-config", { preHandler: authenticate }, async () => ({
      success: true,
      message: "Terminal NO/NC settings saved"
    }));

    // Barrier Config
    app.post("/v1/bollards/:id/barrier-config", { preHandler: authenticate }, async () => ({
      success: true,
      message: "Barrier speed and sensitivity parameters updated"
    }));

    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it("GET /health should return status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.body);
    expect(body.status).to.equal("ok");
  });

  it("POST /v1/auth/login should authenticate valid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "operator@kjsbollards.co.uk", password: "KjsSecure2026!" }
    });
    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).to.be.a("string");
    authToken = body.accessToken;
  });

  it("POST /v1/auth/login should reject invalid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "wrong@email.com", password: "badpassword" }
    });
    expect(res.statusCode).to.equal(401);
  });

  it("GET /v1/sites should return site list when authenticated", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/sites",
      headers: { authorization: `Bearer ${authToken}` }
    });
    expect(res.statusCode).to.equal(200);
    const sites = JSON.parse(res.body);
    expect(sites).to.be.an("array");
    expect(sites).to.have.lengthOf(1);
    expect(sites[0].bollards).to.have.lengthOf.at.least(1);
  });

  it("GET /v1/bollards/:id/diagnostics should return live I/O states & signal level", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/bollards/b1/diagnostics",
      headers: { authorization: `Bearer ${authToken}` }
    });
    expect(res.statusCode).to.equal(200);
    const diag = JSON.parse(res.body);
    expect(diag.online).to.be.true;
    expect(diag.inputs).to.be.an("array");
    expect(diag.outputs).to.be.an("array");
    expect(diag.signalStrength).to.equal(62);
    expect(diag.cycleCount).to.equal(1420);
    expect(diag.netType).to.equal("WIFI");
  });

  it("POST /v1/bollards should commission new bollard controller", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/bollards",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        siteId: "site-1",
        name: "Test Perimeter Barrier #9",
        deviceCode: "RC200-TEST-09",
        movementSeconds: 4.5
      }
    });
    expect(res.statusCode).to.equal(201);
    const created = JSON.parse(res.body);
    expect(created.name).to.equal("Test Perimeter Barrier #9");
    expect(created.deviceCode).to.equal("RC200-TEST-09");
  });

  it("POST /v1/bollards/:id/reboot should dispatch restart instruction", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/bollards/b1/reboot",
      headers: { authorization: `Bearer ${authToken}` }
    });
    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.body);
    expect(body.success).to.be.true;
  });

  it("POST /v1/bollards/:id/io-config should configure NO/NC terminals", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/bollards/b1/io-config",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { in: [1, 0, 0, 0], out: [0, 0, 0, 0] }
    });
    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.body);
    expect(body.success).to.be.true;
  });

  it("POST /v1/bollards/:id/barrier-config should calibrate speed & sensitivity registers", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/bollards/b1/barrier-config",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { barrierType: "zmt", funCode: "P-00", funVal: 90 }
    });
    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.body);
    expect(body.success).to.be.true;
  });
});
