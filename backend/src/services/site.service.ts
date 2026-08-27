import { Bollard, Site, SiteAccess, User } from "../database/index.js";
import { Actor } from "../types/index.js";
import { getDeviceTelemetry } from "../mqtt/index.js";
import { deviceLogin, getDetails } from "../gatelink/index.js";
import { audit } from "./audit.service.js";

export class SiteService {
  static async getSitesForActor(actor: Actor) {
    const sites = await Site.findAll({
      where: { enabled: true },
      include: [
        { model: Bollard, as: "bollards", where: { enabled: true }, required: false },
        { model: SiteAccess, as: "authorizedUsers", where: { enabled: true }, required: false }
      ],
      order: [
        ["name", "ASC"],
        [{ model: Bollard, as: "bollards" }, "name", "ASC"]
      ]
    });

    const response = [];
    for (const site of sites) {
      const isOwner = !site.ownerId || site.ownerId === actor.id || actor.role === "admin";
      const userAccess = site.authorizedUsers?.find(
        (a) => a.userId === actor.id || a.email.toLowerCase() === actor.email.toLowerCase()
      );

      if (!isOwner && !userAccess) {
        continue;
      }

      const bollardsList = [];
      if (site.bollards) {
        for (const b of site.bollards) {
          let online = false;
          let signal = (b as any).signalStrength ?? 0;
          let cycleCount = (b as any).cycleCount ?? 0;

          // Check live MQTT cache first
          const mqttData = getDeviceTelemetry(b.deviceCode);
          if (mqttData) {
            online = mqttData.online;
            if (mqttData.signalStrength !== undefined) signal = mqttData.signalStrength;
            if (mqttData.cycleCount) cycleCount = mqttData.cycleCount;
          } else {
            try {
              const token = await deviceLogin(b.deviceCode);
              const details = await getDetails(token);
              online = details.netWork.online;
              if (details.netWork.signal !== undefined) signal = details.netWork.signal;
            } catch {}
          }

          bollardsList.push({
            id: b.id,
            name: b.name,
            status: online ? "ONLINE" : "OFFLINE",
            online,
            signalStrength: signal,
            cycleCount,
            safetyOk: online && b.commissioned && b.enabled,
            lastSeen: online
              ? "Live"
              : (b as any).lastHeartbeatAt
              ? new Date((b as any).lastHeartbeatAt).toLocaleTimeString()
              : null,
            serial: b.deviceCode,
            movementSeconds: b.movementSeconds
          });
        }
      }

      const authUsersList = (site.authorizedUsers || []).map((au) => ({
        id: au.id,
        name: au.name,
        email: au.email,
        role: au.role,
        addedAt: au.createdAt ? new Date(au.createdAt).toISOString() : new Date().toISOString(),
        bollardIds: au.bollardIds || []
      }));

      response.push({
        id: site.id,
        name: site.name,
        address: site.address,
        ownerId: site.ownerId,
        bollards: bollardsList,
        authorizedUsers: authUsersList
      });
    }

    return response;
  }

  static async createSite(actor: Actor, data: { name: string; address?: string; ip?: string }) {
    const site = await Site.create({
      name: data.name.trim(),
      address: data.address?.trim() || "Primary Residence / Facility",
      ownerId: actor.id,
      enabled: true
    });

    await audit(actor, null, "site_created", { siteId: site.id, name: site.name }, "info", data.ip);

    return {
      id: site.id,
      name: site.name,
      address: site.address,
      ownerId: site.ownerId,
      bollards: [],
      authorizedUsers: []
    };
  }

  static async grantAccess(
    actor: Actor,
    siteId: string,
    data: { name: string; email: string; role: "admin" | "family" | "staff" | "viewer"; bollardIds?: string[]; ip?: string }
  ) {
    const site = await Site.findByPk(siteId);
    if (!site) {
      const err: any = new Error("Site not found");
      err.statusCode = 404;
      throw err;
    }

    if (actor.role !== "admin" && site.ownerId !== actor.id) {
      const err: any = new Error("Only site owner or admin can manage site access");
      err.statusCode = 403;
      throw err;
    }

    const email = data.email.toLowerCase().trim();
    const targetUser = await User.findOne({ where: { email } });

    const access = await SiteAccess.create({
      siteId,
      userId: targetUser?.id ?? null,
      name: data.name.trim(),
      email,
      role: data.role,
      bollardIds: data.bollardIds || [],
      enabled: true
    });

    await audit(
      actor,
      null,
      "site_access_granted",
      {
        siteId,
        targetEmail: email,
        targetName: data.name,
        role: data.role,
        bollardIds: data.bollardIds
      },
      "info",
      data.ip
    );

    return {
      id: access.id,
      name: access.name,
      email: access.email,
      role: access.role,
      addedAt: access.createdAt ? new Date(access.createdAt).toISOString() : new Date().toISOString(),
      bollardIds: access.bollardIds || []
    };
  }

  static async revokeAccess(actor: Actor, siteId: string, accessId: string, ip?: string) {
    const site = await Site.findByPk(siteId);
    if (!site) {
      const err: any = new Error("Site not found");
      err.statusCode = 404;
      throw err;
    }

    if (actor.role !== "admin" && site.ownerId !== actor.id) {
      const err: any = new Error("Only site owner or admin can revoke site access");
      err.statusCode = 403;
      throw err;
    }

    const access = await SiteAccess.findOne({ where: { id: accessId, siteId } });
    if (!access) {
      const err: any = new Error("Access entry not found");
      err.statusCode = 404;
      throw err;
    }

    await access.destroy();
    await audit(
      actor,
      null,
      "site_access_revoked",
      { siteId, accessId, targetEmail: access.email, targetName: access.name },
      "warning",
      ip
    );

    return { success: true };
  }
}
