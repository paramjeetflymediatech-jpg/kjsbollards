import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js bundler from trying to bundle Sequelize's internal optional dialect files
  serverExternalPackages: ["sequelize", "mysql2", "pg-hstore", "bcryptjs"],
};

export default nextConfig;
