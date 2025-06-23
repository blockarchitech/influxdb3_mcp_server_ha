/**
 * Base InfluxDB Connection Service
 *
 * Handles connection management, health checks, and provides base client access
 * for other specialized services
 */

import { InfluxDBClient } from "@influxdata/influxdb3-client";
import { McpServerConfig, InfluxConfig } from "../config.js";
import { HttpClientService } from "./http-client.service.js";
import { InfluxProductType } from "../helpers/enums/influx-product-types.enum.js";

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
   * Get the correct host for query/write operations (data plane)
   */
  private getDataHost(): string | undefined {
    const influx = this.config.influx;
    if (influx.type === InfluxProductType.CloudDedicated && influx.cluster_id) {
      return `https://${influx.cluster_id}.a.influxdb.io`;
    }
    return influx.url;
  }

  /**
   * Get the correct host for management operations (control plane)
   */
  private getManagementHost(): string | undefined {
    const influx = this.config.influx;
    if (influx.type === InfluxProductType.CloudDedicated) {
      return "https://console.influxdata.com";
    }
    return influx.url;
  }

  /**
   * Initialize InfluxDB client
   */
  private initializeClient(): void {
    try {
      const influxConfig = this.config.influx;
      if (this.isValidConfig(influxConfig)) {
        const clientConfig: any = {
          host: this.getDataHost(),
          token: influxConfig.token,
        };
        this.client = new InfluxDBClient(clientConfig);
      }
    } catch (error) {
      console.error("Failed to initialize InfluxDB client:", error);
      this.client = null;
    }
  }
  /**
   * Check if configuration is valid for data operations (requires data client)
   */
  private isValidConfig(config: InfluxConfig): boolean {
    if (config.type === InfluxProductType.CloudDedicated) {
      return !!(config.cluster_id && config.token);
    }
    return !!(config.url && config.token);
  }
  /**
   * Check if we have management capabilities
   */
  hasManagementCapabilities(): boolean {
    const config = this.config.influx;
    if (config.type === InfluxProductType.CloudDedicated) {
      return !!(
        config.cluster_id &&
        config.account_id &&
        config.management_token
      );
    }
    // For core/enterprise, we have the token but actual permissions depend on token type
    // (operator/admin tokens have management access, resource tokens may not)
    return !!(config.url && config.token);
  }

  /**
   * Check if we have data (query/write) capabilities
   */
  hasDataCapabilities(): boolean {
    return this.isValidConfig(this.config.influx);
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
      url: this.getDataHost() || "",
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
    const url = this.getDataHost();
    if (!url) {
      return { ok: false, message: "No data host configured" };
    }
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/ping`, {
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
    const url = this.getDataHost();
    if (!url || !this.client) {
      return { status: "fail" };
    }
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/health`, {
        headers: {
          Authorization: `Token ${this.config.influx.token}`,
        },
      });
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
   * For cloud-dedicated, use data host for query/write, management host for admin
   */ getInfluxHttpClient(forManagement = false): HttpClientService {
    const influxConfig = this.config.influx;
    const host =
      (forManagement ? this.getManagementHost() : this.getDataHost()) || "";

    let token: string = "";
    if (
      forManagement &&
      influxConfig.type === InfluxProductType.CloudDedicated
    ) {
      token = influxConfig.management_token || "";
    } else {
      token = influxConfig.token || "";
    }

    return HttpClientService.createInfluxClient(host, token);
  }

  /**
   * Get configuration
   */
  getConfig(): McpServerConfig {
    return this.config;
  }
}
