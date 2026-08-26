import bcrypt from "bcryptjs";
import { sequelize } from "./db.js";
import { User } from "./models/index.js";

const email = process.env.KJS_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.KJS_ADMIN_PASSWORD;
const name = process.env.KJS_ADMIN_NAME?.trim() || "KJS Administrator";

if (!email || !password || password.length < 12) {
  throw new Error("Set KJS_ADMIN_EMAIL and KJS_ADMIN_PASSWORD (minimum 12 characters)");
}

try {
  await sequelize.authenticate();
  const hash = await bcrypt.hash(password, 12);

  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      email,
      name,
      passwordHash: hash,
      role: "admin",
      enabled: true
    }
  });

  if (!created) {
    user.name = name;
    user.passwordHash = hash;
    user.role = "admin";
    user.enabled = true;
    await user.save();
    console.log(`Administrator updated: ${email}`);
  } else {
    console.log(`Administrator created: ${email}`);
  }
} finally {
  await sequelize.close();
}
