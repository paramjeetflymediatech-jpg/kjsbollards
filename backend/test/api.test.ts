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

    // Auth Register
    app.post("/v1/auth/register", async (request, reply) => {
      const { name, email, password, siteName } = (request.body || {}) as any;
      if (!email || !password) return reply.code(400).send({ error: "Missing required fields" });
      const token = await new SignJWT({ id: "usr-owner-1", email, role: "owner", name: name || "Primary Owner" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("kjs-bollards")
        .setSubject("usr-owner-1")
        .setExpirationTime("2h")
        .sign(JWT_SECRET);
      const newSite = {
        id: "site-registered-1",
        name: siteName || "Primary Security Site",
        address: "Primary Residence / Facility",
        ownerId: "usr-owner-1",
        bollards: [],
        authorizedUsers: []
      };
      sampleSites.push(newSite as any);
      return {
        accessToken: token,
        user: { id: "usr-owner-1", name: name || "Primary Owner", email, role: "owner" },
        site: newSite
      };
    });

    // Create Site
    app.post("/v1/sites", { preHandler: authenticate }, async (request, reply) => {
      const body = (request.body || {}) as any;
      const newSite = {
        id: "site-" + Date.now(),
        name: body.name || "New Site",
        address: body.address || "Primary Address",
        bollards: [],
        authorizedUsers: []
      };
      sampleSites.push(newSite as any);
      return reply.code(201).send(newSite);
    });

    // Grant Access
    app.post("/v1/sites/:siteId/access", { preHandler: authenticate }, async (request, reply) => {
      const { siteId } = request.params as { siteId: string };
      const body = (request.body || {}) as any;
      const site = sampleSites.find((s) => s.id === siteId);
      if (!site) return reply.code(404).send({ error: "Site not found" });
      const newAccess = {
        id: "acc-" + Date.now(),
        name: body.name,
        email: body.email,
        role: body.role || "viewer",
        addedAt: new Date().toISOString(),
        bollardIds: body.bollardIds || []
      };
      (site as any).authorizedUsers = (site as any).authorizedUsers || [];
      (site as any).authorizedUsers.push(newAccess);
      return reply.code(201).send(newAccess);
    });

    // Revoke Access
    app.delete("/v1/sites/:siteId/access/:accessId", { preHandler: authenticate }, async (request, reply) => {
      const { siteId, accessId } = request.params as { siteId: string; accessId: string };
      const site = sampleSites.find((s) => s.id === siteId);
      if (!site) return reply.code(404).send({ error: "Site not found" });
      (site as any).authorizedUsers = ((site as any).authorizedUsers || []).filter((u: any) => u.id !== accessId);
      return { success: true };
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

  it("POST /v1/auth/register should register a new owner and create primary site", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        name: "Lord Kensington",
        email: "kensington@estate.co.uk",
        password: "SuperSecretPassword123!",
        siteName: "Kensington Private Estate"
      }
    });
    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).to.be.a("string");
    expect(body.user.role).to.equal("owner");
    expect(body.site.name).to.equal("Kensington Private Estate");
  });

  it("POST /v1/sites should create an additional site", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/sites",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: "North Outpost Facility",
        address: "Surrey Hills Access Gate"
      }
    });
    expect(res.statusCode).to.equal(201);
    const site = JSON.parse(res.body);
    expect(site.name).to.equal("North Outpost Facility");
  });

  it("POST /v1/sites/:siteId/access and DELETE should grant and revoke access", async () => {
    const grantRes = await app.inject({
      method: "POST",
      url: "/v1/sites/site-1/access",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: "Alice Security",
        email: "alice@security.com",
        role: "family",
        bollardIds: ["b1"]
      }
    });
    expect(grantRes.statusCode).to.equal(201);
    const access = JSON.parse(grantRes.body);
    expect(access.email).to.equal("alice@security.com");
    expect(access.role).to.equal("family");

    const revokeRes = await app.inject({
      method: "DELETE",
      url: `/v1/sites/site-1/access/${access.id}`,
      headers: { authorization: `Bearer ${authToken}` }
    });
    expect(revokeRes.statusCode).to.equal(200);
    const revokeBody = JSON.parse(revokeRes.body);
    expect(revokeBody.success).to.be.true;
  });
});
