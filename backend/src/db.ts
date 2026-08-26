import { Sequelize } from "sequelize";
import { config } from "./config.js";

export const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: "mysql",
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  timezone: "+00:00",
  define: {
    underscored: true,
    timestamps: true
  }
});
