import { Site, User } from "../database/index.js";
import { signJwtToken } from "../helpers/jwt.helper.js";
import { hashPassword, comparePassword } from "../helpers/crypto.helper.js";
import { audit } from "./audit.service.js";
import { Role } from "../types/index.js";

export class AuthService {
  static async registerOwner(data: {
    name: string;
    email: string;
    password: string;
    siteName?: string;
    ip?: string;
  }) {
    const email = data.email.toLowerCase().trim();
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      const error: any = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await hashPassword(data.password);
    const user = await User.create({
      name: data.name.trim(),
      email,
      passwordHash,
      role: "owner",
      enabled: true
    });

    const site = await Site.create({
      name: data.siteName?.trim() || "My Security Perimeter",
      address: "Primary Residence / Facility",
      ownerId: user.id,
      enabled: true
    });

    const accessToken = await signJwtToken({ id: user.id, email: user.email, role: user.role });

    await audit(
      { id: user.id, email: user.email, role: user.role as Role },
      null,
      "user_registered",
      { siteId: site.id, siteName: site.name },
      "info",
      data.ip
    );

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      site: { id: site.id, name: site.name, address: site.address }
    };
  }

  static async login(data: { email: string; password: string; ip?: string }) {
    const email = data.email.toLowerCase().trim();
    const user = await User.findOne({
      where: {
        email,
        enabled: true
      }
    });

    if (!user || !(await comparePassword(data.password, user.passwordHash))) {
      await audit(null, null, "login_failed", { email }, "warning", data.ip);
      const error: any = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    const accessToken = await signJwtToken({ id: user.id, email: user.email, role: user.role });

    await audit(
      { id: user.id, email: user.email, role: user.role as Role },
      null,
      "login_success",
      {},
      "info",
      data.ip
    );

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  }
}
