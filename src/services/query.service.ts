/**
 * InfluxDB Query Service
 *
 * Handles query operations using InfluxDB v3 SQL API
 */

import { BaseConnectionService } from "./base-connection.service.js";

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
   * Execute SQL query
   * POST /api/v3/query_sql
   */
  async executeQuery(
    query: string,
    database: string,
    options: {
      format?: "json" | "csv" | "parquet" | "jsonl" | "pretty";
    } = {},
  ): Promise<any> {
    const { format = "json" } = options;
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
  }

  /**
   * Get all measurements/tables in a database
   * Uses information_schema.columns to discover tables
   */
  async getMeasurements(database: string): Promise<MeasurementInfo[]> {
    try {
      const result = await this.executeQuery(
        "SELECT DISTINCT table_name FROM information_schema.columns WHERE table_schema = 'iox'",
        database,
        { format: "json" },
      );

      if (Array.isArray(result)) {
        return result.map((row: any) => ({
          name: row.table_name,
        }));
      }

      return result;
    } catch (error: any) {
      throw new Error(`Failed to get measurements: ${error.message}`);
    }
  }

  /**
   * Get schema information for a measurement/table
   * Uses information_schema.columns query
   */
  async getMeasurementSchema(
    measurement: string,
    database: string,
  ): Promise<SchemaInfo> {
    try {
      const result = await this.executeQuery(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${measurement}' AND table_schema = 'iox'`,
        database,
        { format: "json" },
      );

      if (Array.isArray(result)) {
        const columns = result.map((row: any) => ({
          name: row.column_name,
          type: row.data_type,
        }));

        if (columns.length === 0) {
          const tableExists = await this.executeQuery(
            `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '${measurement}' AND table_schema = 'iox'`,
            database,
            { format: "json" },
          );

          if (
            Array.isArray(tableExists) &&
            tableExists[0] &&
            tableExists[0].count === 0
          ) {
            throw new Error(
              `Table '${measurement}' does not exist in database '${database}'`,
            );
          }
        }

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
