/**
 * Data Writing Tools
 */

import { z } from "zod";
import { InfluxDBMasterService } from "../../services/influxdb-master.service.js";
import { McpTool } from "../index.js";

export function createWriteTools(
  influxService: InfluxDBMasterService,
): McpTool[] {
  return [
    {
      name: "write_line_protocol",
      description: `Write data to InfluxDB using line protocol format (all versions). Supports single records or batches.

Line Protocol Syntax:
measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp

Components:
- measurement: table/measurement name (required)
- tags: indexed metadata (optional) - comma-separated key=value pairs
- fields: actual data (required) - space-separated from tags, comma-separated key=value pairs  
- timestamp: optional nanosecond precision timestamp

Field Value Types:
- Strings: "quoted string"
- Floats: 123.45
- Integers: 123i (note the 'i' suffix)
- Booleans: t or f

Examples:
Single record: temperature,location=office,building=main value=23.5,humidity=45i 1640995200000000000
Batch (separate with newlines):
temperature,location=office value=23.5 1640995200000000000
humidity,location=office value=45i 1640995201000000000

Special characters in tags/fields must be escaped: spaces, commas, equals signs with backslashes.`,
      inputSchema: {
        type: "object",
        properties: {
          database: {
            type: "string",
            description: "Name of the database to write to",
          },
          data: {
            type: "string",
            description:
              "Line protocol formatted data. For multiple records, separate each line with \\n",
          },
          precision: {
            type: "string",
            enum: [
              "auto",
              "nanosecond",
              "microsecond",
              "millisecond",
              "second",
            ],
            description: "Precision of timestamps",
            default: "nanosecond",
          },
          acceptPartial: {
            type: "boolean",
            description: "Accept partial writes",
            default: true,
          },
          noSync: {
            type: "boolean",
            description: "Acknowledge without waiting for WAL persistence",
            default: false,
          },
        },
        required: ["database", "data"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        database: z.string().describe("Name of the database to write to"),
        data: z.string().describe("Line protocol formatted data"),
        precision: z
          .enum(["auto", "nanosecond", "microsecond", "millisecond", "second"])
          .optional()
          .default("nanosecond"),
        acceptPartial: z.boolean().optional().default(true),
        noSync: z.boolean().optional().default(false),
      }),
      handler: async (args) => {
        try {
          await influxService.write.writeLineProtocol(
            args.data,
            args.database,
            {
              precision: args.precision,
              acceptPartial: args.acceptPartial,
              noSync: args.noSync,
            },
          );

          return {
            content: [
              {
                type: "text",
                text: `Data written successfully to database '${args.database}'`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
  ];
}
