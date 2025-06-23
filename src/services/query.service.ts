/**
 * InfluxDB Query Service
 *
 * Handles query operations using InfluxDB v3 SQL API
 */

import { BaseConnectionService } from "./base-connection.service.js";
import { InfluxProductType } from "../helpers/enums/influx-product-types.enum.js";

export interface QueryResult {
  results?: any[];
  data?: any;
}

export interface MeasurementInfo {
  name: string;
}

export interface SchemaInfo {
  columns: Array<{
    name: string;
    type: string;
  }>;
}

export class QueryService {
  private baseService: BaseConnectionService;

  constructor(baseService: BaseConnectionService) {
    this.baseService = baseService;
  }

  /**
   * Execute SQL query (single entrypoint for all product types)
   * For core/enterprise: HTTP API
   * For cloud-dedicated: influxdb3 client
   */
  async executeQuery(
    query: string,
    database: string,
    options: {
      format?: "json" | "csv" | "parquet" | "jsonl" | "pretty";
    } = {},
  ): Promise<any> {
    this.baseService.validateDataCapabilities();

    const format = options.format ?? "json";
    const connectionInfo = this.baseService.getConnectionInfo();
    switch (connectionInfo.type) {
      case InfluxProductType.CloudDedicated:
        return this.executeCloudDedicatedQuery(query, database);
      case InfluxProductType.Core:
      case InfluxProductType.Enterprise:
        return this.executeCoreEnterpriseQuery(query, database, format);
      default:
        throw new Error(
          `Unsupported InfluxDB product type: ${connectionInfo.type}`,
        );
    }
  }

  /**
   * Query for core/enterprise (HTTP API)
   */
  private async executeCoreEnterpriseQuery(
    query: string,
    database: string,
    format: string,
  ): Promise<any> {
    try {
      const httpClient = this.baseService.getInfluxHttpClient();
      const payload = {
        db: database,
        q: query,
        format: format,
      };
      let acceptHeader = "application/json";
      switch (format) {
        case "json":
          acceptHeader = "application/json";
          break;
        case "csv":
          acceptHeader = "text/csv";
          break;
        case "parquet":
          acceptHeader = "application/vnd.apache.parquet";
          break;
        case "jsonl":
          acceptHeader = "application/json";
          break;
        case "pretty":
          acceptHeader = "application/json";
          break;
      }
      const response = await httpClient.post("/api/v3/query_sql", payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: acceptHeader,
        },
      });
      return response;
    } catch (error: any) {
      this.handleQueryError(error);
    }
  }

  /**
   * Query for cloud-dedicated (influxdb3 client)
   */
  private async executeCloudDedicatedQuery(
    query: string,
    database: string,
  ): Promise<any> {
    try {
      const client = this.baseService.getClient();
      if (!client) throw new Error("InfluxDB client not initialized");
      const result = client.query(query, database, { type: "sql" });
      const rows: any[] = [];
      for await (const row of result) {
        rows.push(row);
      }
      console.error("Query result:", rows);
      return rows;
      // const httpClient = this.baseService.getInfluxHttpClient();
      // const payload = {
      //   db: database,
      //   q: query,
      // };
      // const acceptHeader = "application/json";
      // console.error(payload)
      // const response = await httpClient.post("/query", payload, {
      //   headers: {
      //     "Content-Type": "application/json",
      //     Accept: acceptHeader,
      //   },
      // });
      // console.error("Response from cloud-dedicated query:");
      // console.error("result", response)
      // return response;
    } catch (error: any) {
      this.handleQueryError(error);
    }
  }

  /**
   * Centralized error handler for query methods
   */
  private handleQueryError(error: any): never {
    const errorMessage =
      error.response?.data?.error ||
      error.response?.statusText ||
      error.message;
    const statusCode = error.response?.status;
    console.error(`Status: ${statusCode} \n Message: ${errorMessage}`);
    switch (statusCode) {
      case 400:
        throw new Error(`Bad request: ${errorMessage}`);
      case 401:
        throw new Error(`Unauthorized: ${errorMessage}`);
      case 403:
        throw new Error(`Access denied: ${errorMessage}`);
      case 404:
        throw new Error(`Database not found: ${errorMessage}`);
      case 405:
        throw new Error(`Method not allowed: ${errorMessage}`);
      case 422:
        throw new Error(`Unprocessable entity: ${errorMessage}`);
      default:
        throw new Error(`Query failed: ${errorMessage}`);
    }
  }

  /**
   * Get all measurements/tables in a database
   * Uses SHOW TABLES for cloud-dedicated, information_schema for others
   */
  async getMeasurements(database: string): Promise<MeasurementInfo[]> {
    this.baseService.validateDataCapabilities();

    const connectionInfo = this.baseService.getConnectionInfo();
    let query: string;
    switch (connectionInfo.type) {
      case InfluxProductType.CloudDedicated:
        query = "SHOW TABLES";
        break;
      case InfluxProductType.Core:
      case InfluxProductType.Enterprise:
        query =
          "SELECT DISTINCT table_name FROM information_schema.columns WHERE table_schema = 'iox'";
        break;
      default:
        throw new Error(
          `Unsupported InfluxDB product type: ${connectionInfo.type}`,
        );
    }
    try {
      const result = await this.executeQuery(query, database, {
        format: "json",
      });
      if (Array.isArray(result)) {
        if (connectionInfo.type === InfluxProductType.CloudDedicated) {
          return result
            .filter((row: any) => row.table_schema === "iox")
            .map((row: any) => ({ name: row.table_name }));
        } else {
          return result.map((row: any) => ({ name: row.table_name }));
        }
      }
      return result;
    } catch (error: any) {
      throw new Error(`Failed to get measurements: ${error.message}`);
    }
  }

  /**
   * Get schema information for a measurement/table
   * Uses SHOW COLUMNS for cloud-dedicated, information_schema for others
   */
  async getMeasurementSchema(
    measurement: string,
    database: string,
  ): Promise<SchemaInfo> {
    this.baseService.validateDataCapabilities();

    const connectionInfo = this.baseService.getConnectionInfo();
    let query: string;
    switch (connectionInfo.type) {
      case InfluxProductType.CloudDedicated:
        query = `SHOW COLUMNS IN ${measurement}`;
        break;
      case InfluxProductType.Core:
      case InfluxProductType.Enterprise:
        query = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${measurement}' AND table_schema = 'iox'`;
        break;
      default:
        throw new Error(
          `Unsupported InfluxDB product type: ${connectionInfo.type}`,
        );
    }
    try {
      const result = await this.executeQuery(query, database, {
        format: "json",
      });
      if (Array.isArray(result)) {
        const columns: { name: string; type: string }[] = result.map(
          (row: any) => ({
            name: row.column_name,
            type: row.data_type,
          }),
        );
        return { columns };
      }
      return result;
    } catch (error: any) {
      if (error.message.includes("not found")) {
        throw new Error(
          `Table '${measurement}' does not exist in database '${database}'`,
        );
      }
      throw new Error(
        `Failed to get schema for measurement '${measurement}': ${error.message}`,
      );
    }
  }
}
