import { z } from "zod";

try {
  process.loadEnvFile?.();
} catch {}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().min(1).default("mysql://root:password@localhost:3306/bollards"),
  JWT_SECRET: z.string().min(32).default("kjs-super-secure-dev-jwt-secret-key-32bytes!!"),
  GATELINK_BASE_URL: z.string().url().default("https://www.boleyun.cn"),
  GATELINK_ACCESS_KEY_ID: z.string().default("testAccessKeyId123456"),
  GATELINK_ACCESS_KEY_SECRET: z.string().default("testAccessKeySecret123456"),
  TRUST_PROXY: z.string().default("true").transform(v => v === "true"),
  MQTT_ENABLED: z.string().default("false").transform(v => v === "true"),
  MQTT_BROKER_URL: z.string().default("mqtt://broker.emqx.io:1883"),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_CLIENT_ID: z.string().default("kjs_backend_server")
});

export const config = schema.parse(process.env);

