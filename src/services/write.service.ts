/**
 * InfluxDB Write Service
 *
 * Handles write operations using InfluxDB v3 line protocol API
 * Note: InfluxDB v3 only supports writing via line protocol - no UPDATE/DELETE operations
 */

import { BaseConnectionService } from "./base-connection.service.js";

export type Precision =
  | "auto"
  | "nanosecond"
  | "microsecond"
  | "millisecond"
  | "second";

export class WriteService {
  private baseService: BaseConnectionService;

  constructor(baseService: BaseConnectionService) {
    this.baseService = baseService;
  }

  /**
   * Write data using line protocol format
   * POST /api/v3/write_lp
   *
   * Line protocol format:
   * measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp
   *
   * Multiple data points can be written by separating them with newlines:
   * measurement1,tag=value field=value1 timestamp1
   * measurement2,tag=value field=value2 timestamp2
   */
  async writeLineProtocol(
    lineProtocolData: string,
    database: string,
    options: {
      precision?: Precision;
      acceptPartial?: boolean;
      noSync?: boolean;
    } = {},
  ): Promise<void> {
    const {
      precision = "nanosecond",
      acceptPartial = true,
      noSync = false,
    } = options;

    try {
      const httpClient = this.baseService.getInfluxHttpClient();

      const params = new URLSearchParams({
        db: database,
        precision,
        accept_partial: acceptPartial.toString(),
        no_sync: noSync.toString(),
      });

      await httpClient.post(
        `/api/v3/write_lp?${params.toString()}`,
        lineProtocolData,
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Accept: "application/json",
          },
        },
      );
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(
          `Bad request: Invalid line protocol format or parameters`,
        );
      } else if (error.response?.status === 401) {
        throw new Error("Unauthorized: Check your InfluxDB token permissions");
      } else if (error.response?.status === 403) {
        throw new Error(
          "Access denied: Insufficient permissions for database operations",
        );
      } else if (error.response?.status === 413) {
        throw new Error(
          "Request entity too large: Reduce the size of your line protocol data",
        );
      } else if (error.response?.status === 422) {
        throw new Error("Unprocessable entity: Invalid line protocol syntax");
      }
      throw new Error(
        `Failed to write data to database '${database}': ${error.response?.data}`,
      );
    }
  }
}
