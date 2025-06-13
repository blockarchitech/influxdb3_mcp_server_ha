/**
 * InfluxDB Database Management Service
 *
 * Handles database lifecycle operations: list, create, delete
 */

import { BaseConnectionService } from "./base-connection.service.js";

export interface DatabaseInfo {
  name: string;
}

export class DatabaseManagementService {
  private baseService: BaseConnectionService;

  constructor(baseService: BaseConnectionService) {
    this.baseService = baseService;
  }

  /**
   * List all databases
   * GET /api/v3/configure/database?format=json
   */
  async listDatabases(): Promise<DatabaseInfo[]> {
    const connectionInfo = this.baseService.getConnectionInfo();

    if (!connectionInfo.isConnected) {
      return [];
    }

    try {
      const httpClient = this.baseService.getInfluxHttpClient();
      const response = await httpClient.get<{ databases: string[] }>(
        "/api/v3/configure/database?format=json",
      );

      if (!response || typeof response !== "object") {
        throw new Error("Invalid response format from InfluxDB API");
      }

      let databases: any[] = [];

      if (Array.isArray(response.databases)) {
        databases = response.databases;
      } else if (Array.isArray(response)) {
        databases = response as any[];
      } else if (response && typeof response === "object") {
        const possibleDatabases =
          (response as any).data?.databases ||
          (response as any).result?.databases ||
          (response as any).databases;
        if (Array.isArray(possibleDatabases)) {
          databases = possibleDatabases;
        } else {
          throw new Error(
            `Unexpected response structure: ${JSON.stringify(response)}`,
          );
        }
      } else {
        throw new Error(
          `Unexpected response structure: ${JSON.stringify(response)}`,
        );
      }

      return databases.map((item: any) => {
        if (typeof item === "string") {
          return { name: item };
        } else if (item && typeof item === "object" && item["iox::database"]) {
          return { name: item["iox::database"] };
        } else if (item && typeof item === "object" && item.name) {
          return { name: item.name };
        } else {
          return { name: String(item) };
        }
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Unauthorized: Check your InfluxDB token permissions");
      } else if (error.response?.status === 404) {
        throw new Error(
          "Database endpoint not found: Check your InfluxDB version and URL",
        );
      } else if (error.response?.status === 403) {
        throw new Error(
          "Forbidden: Token does not have sufficient permissions",
        );
      } else if (error.response?.data) {
        throw new Error(
          `InfluxDB API error: ${JSON.stringify(error.response.data)}`,
        );
      } else if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Connection refused: Check if InfluxDB is running and URL is correct",
        );
      } else if (error.code === "ENOTFOUND") {
        throw new Error("Host not found: Check your InfluxDB URL");
      }

      throw new Error(`Database list request failed: ${error.message}`);
    }
  }

  /**
   * Create a new database
   * POST /api/v3/configure/database
   */
  async createDatabase(name: string): Promise<boolean> {
    try {
      const httpClient = this.baseService.getInfluxHttpClient();
      await httpClient.post("/api/v3/configure/database", {
        db: name,
      });
      return true;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(`Bad request: Invalid database name '${name}'`);
      } else if (error.response?.status === 401) {
        throw new Error("Unauthorized: Check your InfluxDB token permissions");
      } else if (error.response?.status === 409) {
        throw new Error(`Database '${name}' already exists`);
      }
      throw new Error(`Failed to create database '${name}': ${error.message}`);
    }
  }

  /**
   * Delete a database
   * DELETE /api/v3/configure/database?db={name}
   */
  async deleteDatabase(name: string): Promise<boolean> {
    try {
      const httpClient = this.baseService.getInfluxHttpClient();
      await httpClient.delete(
        `/api/v3/configure/database?db=${encodeURIComponent(name)}`,
      );
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Unauthorized: Check your InfluxDB token permissions");
      } else if (error.response?.status === 404) {
        throw new Error(`Database '${name}' not found`);
      }
      throw new Error(`Failed to delete database '${name}': ${error.message}`);
    }
  }
}
