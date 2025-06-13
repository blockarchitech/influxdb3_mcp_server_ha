/**
 * Base InfluxDB Connection Service
 *
 * Handles connection management, health checks, and provides base client access
 * for other specialized services
 */

import { InfluxDBClient } from "@influxdata/influxdb3-client";
import { McpServerConfig, InfluxConfig } from "../config.js";
import { HttpClientService } from "./http-client.service.js";

export interface ConnectionInfo {
  isConnected: boolean;
  url: string;
  hasToken: boolean;
  database?: string;
  type?: string;
}

export class BaseConnectionService {
  private client: InfluxDBClient | null = null;
  private config: McpServerConfig;
  private httpClient: HttpClientService;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.httpClient = new HttpClientService();
    this.initializeClient();
  }

  /**
   * Initialize InfluxDB client
   */
  private initializeClient(): void {
    try {
      const influxConfig = this.config.influx;
      if (this.isValidConfig(influxConfig)) {
        const clientConfig: any = {
          host: influxConfig.url,
          token: influxConfig.token,
        };
        this.client = new InfluxDBClient(clientConfig);
      }
    } catch (error) {
      // Only log for user-facing error
    }
  }

  /**
   * Check if configuration is valid
   */
  private isValidConfig(config: InfluxConfig): boolean {
    return !!(config.url && config.token);
  }

  /**
   * Get the main client instance
   */
  getClient(): InfluxDBClient | null {
    return this.client;
  }

  /**
   * Get connection information
   */
  getConnectionInfo(): ConnectionInfo {
    const influxConfig = this.config.influx;
    return {
      isConnected: !!this.client,
      url: influxConfig.url,
      hasToken: !!influxConfig.token,
      type: influxConfig.type,
    };
  }

  /**
   * Ping InfluxDB instance (returns version and build info if available)
   */
  async ping(): Promise<{
    ok: boolean;
    version?: string;
    build?: string;
    message?: string;
  }> {
    const influxType = this.config.influx.type;
    const url = this.config.influx.url.replace(/\/$/, "");
    try {
      const response = await fetch(`${url}/ping`, {
        headers: {
          Authorization: `Token ${this.config.influx.token}`,
        },
      });
      if (response.ok) {
        const version = response.headers.get("x-influxdb-version") || undefined;
        let build = response.headers.get("x-influxdb-build") || undefined;
        if (!build) {
          if (version) {
            build = "Other";
          }
        }
        return { ok: true, version, build };
      } else {
        return {
          ok: false,
          message: `Ping failed with status ${response.status}`,
        };
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{ status: string; checks?: any[] }> {
    const connectionInfo = this.getConnectionInfo();
    if (!connectionInfo.isConnected) {
      return { status: "fail" };
    }
    try {
      const response = await fetch(
        `${connectionInfo.url.replace(/\/$/, "")}/health`,
        {
          headers: {
            Authorization: `Token ${this.config.influx.token}`,
          },
        },
      );
      if (response.ok) {
        try {
          const healthData = await response.json();
          return healthData;
        } catch {
          return { status: "pass" };
        }
      } else {
        return { status: "fail" };
      }
    } catch (error) {
      return { status: "fail" };
    }
  }

  /**
   * Get pre-configured HTTP client for InfluxDB API calls
   */
  getInfluxHttpClient(): HttpClientService {
    const influxConfig = this.config.influx;
    return HttpClientService.createInfluxClient(
      influxConfig.url,
      influxConfig.token,
    );
  }
}
