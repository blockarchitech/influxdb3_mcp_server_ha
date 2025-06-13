/**
 * MCP Server Configuration
 *
 * Handles environment variables and configuration for the standalone MCP server
 */

import dotenv from "dotenv";

dotenv.config();

export interface InfluxConfig {
  url: string;
  token: string;
  type: string;
}

export interface McpServerConfig {
  influx: InfluxConfig;
  server: {
    name: string;
    version: string;
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): McpServerConfig {
  return {
    influx: {
      url: process.env.INFLUX_DB_INSTANCE_URL || "http://localhost:8081/",
      token: process.env.INFLUX_DB_TOKEN || "",
      type: process.env.INFLUX_DB_PRODUCT_TYPE || "unknown",
    },
    server: {
      name: "influxdb-mcp-server",
      version: "1.0.0",
    },
  };
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(config: McpServerConfig): void {
  const errors: string[] = [];

  if (!config.influx.url) {
    errors.push("INFLUX_DB_INSTANCE_URL (or INFLUX_URL) is required");
  }
  if (!config.influx.token) {
    errors.push("INFLUX_DB_TOKEN (or INFLUX_TOKEN) is required");
  }
  if (
    !config.influx.type ||
    !["enterprise", "core", "unknown"].includes(config.influx.type)
  ) {
    errors.push(
      "INFLUX_DB_PRODUCT_TYPE is required and must be one of: enterprise, core",
    );
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }
}
