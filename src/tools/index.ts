/**
 * MCP Tools Definitions
 *
 * Defines all the tools available through the MCP server
 */

import { z } from "zod";
import { InfluxDBMasterService } from "../services/influxdb-master.service.js";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  zodSchema: z.ZodSchema;
  handler: (
    args: any,
  ) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

export function createTools(influxService: InfluxDBMasterService): McpTool[] {
  return [
    {
      name: "get_help",
      description:
        "Get help and troubleshooting guidance for InfluxDB operations. Supports specific categories or keyword search.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      zodSchema: z.object({}),
      handler: async (args) => {
        try {
          const helpContent = influxService.help.getHelp();
          return {
            content: [
              {
                type: "text",
                text: helpContent,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error getting help: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      },
    },

    {
      name: "write_line_protocol",
      description: `Write data to InfluxDB using line protocol format. Supports single records or batches.

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

    {
      name: "create_database",
      description:
        "Create a new database in InfluxDB. Database names must follow InfluxDB naming rules: alphanumeric characters, dashes (-), underscores (_), and forward slashes (/) are allowed. Must start with a letter or number. Maximum 64 characters.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Name of the database to create (alphanumeric, -, _, / allowed; max 64 chars; must start with letter/number)",
            pattern: "^[a-zA-Z0-9][a-zA-Z0-9\\-_/]*$",
            maxLength: 64,
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        name: z
          .string()
          .min(1, "Database name cannot be empty")
          .max(64, "Database name cannot exceed 64 characters")
          .regex(
            /^[a-zA-Z0-9]/,
            "Database name must start with a letter or number",
          )
          .regex(
            /^[a-zA-Z0-9\-_/]+$/,
            "Database name can only contain alphanumeric characters, dashes (-), underscores (_), and forward slashes (/)",
          )
          .describe("Name of the database to create"),
      }),
      handler: async (args) => {
        try {
          await influxService.database.createDatabase(args.name);

          return {
            content: [
              {
                type: "text",
                text: `Database '${args.name}' created successfully`,
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

    {
      name: "delete_database",
      description:
        "Delete a database from InfluxDB. Use the exact database name as returned by the list_databases tool.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Name of the database to delete (use exact name from database list)",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        name: z.string().describe("Name of the database to delete"),
      }),
      handler: async (args) => {
        try {
          await influxService.database.deleteDatabase(args.name);

          return {
            content: [
              {
                type: "text",
                text: `Database '${args.name}' deleted successfully`,
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

    {
      name: "execute_query",
      description:
        "Execute a SQL query against an InfluxDB database. Returns results in the specified format (defaults to JSON).",
      inputSchema: {
        type: "object",
        properties: {
          database: {
            type: "string",
            description: "Name of the database to query",
          },
          query: {
            type: "string",
            description: "SQL query to execute.",
          },
          format: {
            type: "string",
            enum: ["json", "csv", "parquet", "jsonl", "pretty"],
            description: "Output format for query results",
            default: "json",
          },
        },
        required: ["database", "query"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        database: z.string().describe("Name of the database to query"),
        query: z.string().describe("SQL query to execute"),
        format: z
          .enum(["json", "csv", "parquet", "jsonl", "pretty"])
          .optional()
          .default("json"),
      }),
      handler: async (args) => {
        try {
          const result = await influxService.query.executeQuery(
            args.query,
            args.database,
            {
              format: args.format,
            },
          );
          let resultText = "";
          if (args.format === "json") {
            resultText = `Query executed successfully:\n${JSON.stringify(result, null, 2)}`;
          } else {
            resultText = `Query executed successfully (${args.format} format):\n${result}`;
          }
          return {
            content: [
              {
                type: "text",
                text: resultText,
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

    {
      name: "get_measurements",
      description:
        "Get a list of all measurements (tables) in a database. Uses the InfluxDB information_schema.columns to discover tables.",
      inputSchema: {
        type: "object",
        properties: {
          database: {
            type: "string",
            description: "Name of the database to list measurements from",
          },
        },
        required: ["database"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        database: z
          .string()
          .describe("Name of the database to list measurements from"),
      }),
      handler: async (args) => {
        try {
          const measurements = await influxService.query.getMeasurements(
            args.database,
          );

          const measurementList = measurements.map((m) => m.name).join(", ");
          const count = measurements.length;

          return {
            content: [
              {
                type: "text",
                text: `Found ${count} measurement${count !== 1 ? "s" : ""} in database '${args.database}':\n${measurementList || "None"}`,
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

    {
      name: "get_measurement_schema",
      description:
        "Get the schema (column information) for a specific measurement/table. Uses the InfluxDB information_schema.columns to retrieve column names and types.",
      inputSchema: {
        type: "object",
        properties: {
          database: {
            type: "string",
            description: "Name of the database containing the measurement",
          },
          measurement: {
            type: "string",
            description: "Name of the measurement to describe",
          },
        },
        required: ["database", "measurement"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        database: z
          .string()
          .describe("Name of the database containing the measurement"),
        measurement: z.string().describe("Name of the measurement to describe"),
      }),
      handler: async (args) => {
        try {
          const schema = await influxService.query.getMeasurementSchema(
            args.measurement,
            args.database,
          );

          const columnInfo = schema.columns
            .map((col) => `  - ${col.name}: ${col.type}`)
            .join("\n");
          const count = schema.columns.length;

          return {
            content: [
              {
                type: "text",
                text: `Schema for measurement '${args.measurement}' in database '${args.database}':\n${count} column${count !== 1 ? "s" : ""}:\n${columnInfo}`,
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

    // === Token Management Tools ===

    {
      name: "create_admin_token",
      description:
        "Create a new InfluxDB named admin token with full administrative permissions. Named admin tokens can manage databases, users, and resource tokens, but cannot manage other admin tokens.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              'Optional name for the admin token (e.g., "backup-admin-token"). If not provided, a unique name will be generated.',
          },
        },
        additionalProperties: false,
      },
      zodSchema: z.object({
        name: z
          .string()
          .optional()
          .describe("Optional name for the admin token"),
      }),
      handler: async (args) => {
        try {
          const tokenService = influxService.getTokenManagementService();
          const result = await tokenService.createAdminToken(args.name);
          return {
            content: [
              {
                type: "text",
                text: `Admin token created successfully:\nToken ID: ${result.id}\nToken: ${result.token}\n\n⚠️ Store this token securely - it won't be shown again!`,
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

    {
      name: "list_admin_tokens",
      description:
        "List all admin tokens (operator and named admin tokens) with optional filtering by token name. Named admin tokens have full administrative access including resource token management.",
      inputSchema: {
        type: "object",
        properties: {
          tokenName: {
            type: "string",
            description:
              "Optional filter to search for tokens with names containing this text (case-insensitive partial match)",
          },
        },
        additionalProperties: false,
      },
      zodSchema: z.object({
        tokenName: z
          .string()
          .optional()
          .describe("Optional filter for token name (partial match)"),
      }),
      handler: async (args) => {
        try {
          const tokenService = influxService.getTokenManagementService();
          const filters: any = {};

          if (args.tokenName) {
            filters.tokenName = args.tokenName;
          }

          if (args.orderBy) {
            filters.order = {
              field: args.orderBy,
              direction: args.orderDirection || "ASC",
            };
          }

          const result = await tokenService.listAdminTokens(
            Object.keys(filters).length > 0 ? filters : undefined,
          );

          const resultText = `Admin tokens retrieved successfully:\n${JSON.stringify(result, null, 2)}`;

          return {
            content: [
              {
                type: "text",
                text: resultText,
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

    {
      name: "list_resource_tokens",
      description:
        "List all resource tokens with optional filtering by database name and/or token name, and ordering.",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: {
            type: "string",
            description:
              "Optional filter to show only tokens that have access to this database (partial match)",
          },
          tokenName: {
            type: "string",
            description:
              "Optional filter to search for tokens with names containing this text (case-insensitive partial match)",
          },
          orderBy: {
            type: "string",
            enum: ["created_at", "token_id", "name"],
            description: "Optional field to order results by",
          },
          orderDirection: {
            type: "string",
            enum: ["ASC", "DESC"],
            description:
              "Optional direction for ordering (ASC or DESC). Defaults to ASC.",
            default: "ASC",
          },
        },
        additionalProperties: false,
      },
      zodSchema: z.object({
        databaseName: z
          .string()
          .optional()
          .describe("Optional filter for database name (partial match)"),
        tokenName: z
          .string()
          .optional()
          .describe("Optional filter for token name (partial match)"),
        orderBy: z
          .enum(["created_at", "token_id", "name"])
          .optional()
          .describe("Field to order results by"),
        orderDirection: z
          .enum(["ASC", "DESC"])
          .optional()
          .default("ASC")
          .describe("Ordering direction"),
      }),
      handler: async (args) => {
        try {
          const tokenService = influxService.getTokenManagementService();
          const filters: any = {};

          if (args.databaseName) {
            filters.databaseName = args.databaseName;
          }

          if (args.tokenName) {
            filters.tokenName = args.tokenName;
          }

          if (args.orderBy) {
            filters.order = {
              field: args.orderBy,
              direction: args.orderDirection || "ASC",
            };
          }

          const result = await tokenService.listResourceTokens(
            Object.keys(filters).length > 0 ? filters : undefined,
          );

          const resultText = `Resource tokens retrieved successfully:\n${JSON.stringify(result, null, 2)}`;

          return {
            content: [
              {
                type: "text",
                text: resultText,
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

    {
      name: "regenerate_operator_token",
      description:
        "Regenerate the InfluxDB operator token. Returns the new token value. ⚠️ This action invalidates current operator token and is irreversible. Receive the explicit user confirmation before proceeding.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      zodSchema: z.object({}),
      handler: async () => {
        try {
          const tokenService = influxService.getTokenManagementService();
          const result = await tokenService.regenerateOperatorToken();
          return {
            content: [
              {
                type: "text",
                text: `Operator token regenerated successfully:\nToken ID: ${result.id}\nToken: ${result.token}\n\n⚠️ Store this token securely - it won't be shown again!\n⚠️ The old operator token is now invalid.`,
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

    {
      name: "create_resource_token",
      description:
        'Create a new InfluxDB resource token with specific database permissions. Example: databases=["mydb", "testdb"], actions=["read", "write"]',
      inputSchema: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description:
              'Description/name for the resource token (e.g., "My App Token")',
          },
          databases: {
            type: "array",
            items: { type: "string" },
            description:
              'Array of database names this token can access. Example: ["database1", "database2"]. Use exact database names from your InfluxDB instance.',
            minItems: 1,
          },
          actions: {
            type: "array",
            items: { type: "string", enum: ["read", "write"] },
            description:
              'Array of permissions for the databases. Example: ["read"] for read-only, ["read", "write"] for full access, or ["write"] for write-only.',
            minItems: 1,
          },
          expiry_secs: {
            type: "number",
            description:
              "Optional expiration time in seconds (e.g., 3600 for 1 hour, 86400 for 1 day, 604800 for 1 week). If not specified, token never expires.",
            minimum: 1,
          },
        },
        required: ["description", "databases", "actions"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        description: z
          .string()
          .describe(
            'Description/name for the resource token (e.g., "My App Token")',
          ),
        databases: z
          .array(z.string())
          .min(1)
          .describe(
            'Array of database names this token can access. Example: ["database1", "database2"]',
          ),
        actions: z
          .array(z.enum(["read", "write"]))
          .min(1)
          .describe(
            'Array of permissions: ["read"], ["write"], or ["read", "write"]',
          ),
        expiry_secs: z
          .number()
          .min(1)
          .optional()
          .describe(
            "Optional expiration time in seconds (e.g., 3600, 86400, 604800)",
          ),
      }),
      handler: async (args) => {
        try {
          const tokenService = influxService.getTokenManagementService();

          const permissions = [
            {
              resource_type: "db" as const,
              resource_names: args.databases,
              actions: args.actions as ("read" | "write")[],
            },
          ];

          const expiry_secs = args.expiry_secs;

          const result = await tokenService.createResourceToken(
            args.description,
            permissions,
            expiry_secs,
          );

          let expiryInfo = "\nExpires: Never";
          if (args.expiry_secs) {
            const hours = Math.floor(args.expiry_secs / 3600);
            const days = Math.floor(hours / 24);
            if (days > 0) {
              expiryInfo = `\nExpires: In ${days} day${days !== 1 ? "s" : ""} (${args.expiry_secs} seconds)`;
            } else if (hours > 0) {
              expiryInfo = `\nExpires: In ${hours} hour${hours !== 1 ? "s" : ""} (${args.expiry_secs} seconds)`;
            } else {
              expiryInfo = `\nExpires: In ${args.expiry_secs} seconds`;
            }
          }
          return {
            content: [
              {
                type: "text",
                text: `Resource token created successfully:\nToken ID: ${result.id}\nToken: ${result.token}\nDatabases: ${args.databases.join(", ")}\nActions: ${args.actions.join(", ")}${expiryInfo}\n\n⚠️ Store this token securely - it won't be shown again!`,
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

    {
      name: "delete_token",
      description: "Delete an InfluxDB token by name.",
      inputSchema: {
        type: "object",
        properties: {
          token_name: {
            type: "string",
            description: "Name of the token to delete (required)",
          },
        },
        required: ["token_name"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        token_name: z.string().describe("Name of the token to delete"),
      }),
      handler: async (args) => {
        try {
          const tokenService = influxService.getTokenManagementService();
          const result = await tokenService.deleteToken(args.token_name);
          if (result) {
            return {
              content: [
                {
                  type: "text",
                  text: `Token '${args.token_name}' deleted successfully.`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `Failed to delete token '${args.token_name}'.`,
                },
              ],
              isError: true,
            };
          }
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

    // === End Token Management Tools ===
    // === Cloud Token Management Tools ===

    {
      name: "cloud_list_database_tokens",
      description:
        "List all database tokens for InfluxDB Cloud-Dedicated cluster. Returns token information including permissions and creation dates.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      zodSchema: z.object({}),
      handler: async () => {
        try {
          const cloudTokenService =
            influxService.getCloudTokenManagementService();
          const tokens = await cloudTokenService.listTokens();

          const tokenCount = tokens.length;
          const tokenList = tokens
            .map(
              (token) =>
                `• ${token.description} (ID: ${token.id})\n  Permissions: ${token.permissions.length > 0 ? token.permissions.map((p) => `${p.action}:${p.resource}`).join(", ") : "No access"}\n  Created: ${token.createdAt}`,
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${tokenCount} database token${tokenCount !== 1 ? "s" : ""} in Cloud-Dedicated cluster:\n\n${tokenList || "None"}\n\nFull details:\n${JSON.stringify(tokens, null, 2)}`,
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

    {
      name: "cloud_get_database_token",
      description:
        "Get details of a specific database token by ID for InfluxDB Cloud-Dedicated cluster.",
      inputSchema: {
        type: "object",
        properties: {
          token_id: {
            type: "string",
            description: "The ID of the token to retrieve",
          },
        },
        required: ["token_id"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        token_id: z.string().describe("The ID of the token to retrieve"),
      }),
      handler: async (args) => {
        try {
          const cloudTokenService =
            influxService.getCloudTokenManagementService();
          const token = await cloudTokenService.getToken(args.token_id);

          const permissionsList =
            token.permissions.length > 0
              ? token.permissions
                  .map((p) => `${p.action}:${p.resource}`)
                  .join(", ")
              : "No access";

          return {
            content: [
              {
                type: "text",
                text: `Database Token Details:\n\nDescription: ${token.description}\nID: ${token.id}\nPermissions: ${permissionsList}\nCreated: ${token.createdAt}\nAccount ID: ${token.accountId}\nCluster ID: ${token.clusterId}\n\nFull details:\n${JSON.stringify(token, null, 2)}`,
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

    {
      name: "cloud_create_database_token",
      description:
        'Create a new database token for InfluxDB Cloud-Dedicated cluster. Specify exact permissions per database or create a no-access token.\n\nPermissions format: [{"database": "db_name", "action": "read|write"}, ...]\nExamples:\n• No access: omit permissions field or use []\n• Read-only on \'analytics\': [{"database": "analytics", "action": "read"}]\n• Mixed permissions: [{"database": "logs", "action": "read"}, {"database": "metrics", "action": "write"}]\n• Full access: [{"database": "*", "action": "read"}, {"database": "*", "action": "write"}]',
      inputSchema: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Description/name for the token",
          },
          permissions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                database: {
                  type: "string",
                  description: "Database name or '*' for all databases",
                },
                action: {
                  type: "string",
                  enum: ["read", "write"],
                  description: "Permission level for this database",
                },
              },
              required: ["database", "action"],
              additionalProperties: false,
            },
            description:
              "Array of permission objects. Each object specifies database and action. Leave empty array [] for no-access token.",
          },
        },
        required: ["description"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        description: z.string().describe("Description/name for the token"),
        permissions: z
          .array(
            z.object({
              database: z
                .string()
                .describe("Database name or '*' for all databases"),
              action: z
                .enum(["read", "write"])
                .describe("Permission level for this database"),
            }),
          )
          .optional()
          .describe(
            "Array of permission objects. Omit or use empty array for no-access token",
          ),
      }),
      handler: async (args) => {
        try {
          const cloudTokenService =
            influxService.getCloudTokenManagementService();

          const permissions = (args.permissions || []).map((p: any) => ({
            action: p.action,
            resource: p.database,
          }));

          const result = await cloudTokenService.createToken({
            description: args.description,
            permissions,
          });

          const permissionsList =
            result.permissions.length > 0
              ? result.permissions
                  .map((p) => `${p.action}:${p.resource}`)
                  .join(", ")
              : "No access";

          return {
            content: [
              {
                type: "text",
                text: `Database token created successfully!\n\nDescription: ${result.description}\nToken ID: ${result.id}\nPermissions: ${permissionsList}\nAccess Token: ${result.accessToken}\n\n⚠️ Store this access token securely - it won't be shown again!`,
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

    {
      name: "cloud_update_database_token",
      description:
        'Update an existing database token for InfluxDB Cloud-Dedicated cluster. Can update description and/or permissions with precise control.\n\nPermissions format: [{"database": "db_name", "action": "read|write"}, ...]\nNote: Permissions completely replace existing ones - include all desired permissions.\nExamples:\n• No access: use []\n• Read-only on \'analytics\': [{"database": "analytics", "action": "read"}]\n• Mixed permissions: [{"database": "logs", "action": "read"}, {"database": "metrics", "action": "write"}]\n• Full access: [{"database": "*", "action": "read"}, {"database": "*", "action": "write"}]',
      inputSchema: {
        type: "object",
        properties: {
          token_id: {
            type: "string",
            description: "The ID of the token to update",
          },
          description: {
            type: "string",
            description: "New description for the token (optional)",
          },
          permissions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                database: {
                  type: "string",
                  description: "Database name or '*' for all databases",
                },
                action: {
                  type: "string",
                  enum: ["read", "write"],
                  description: "Permission level for this database",
                },
              },
              required: ["database", "action"],
              additionalProperties: false,
            },
            description:
              "Array of permission objects. Each object specifies database and action. Use empty array [] for no-access token.",
          },
        },
        required: ["token_id"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        token_id: z.string().describe("The ID of the token to update"),
        description: z
          .string()
          .optional()
          .describe("New description for the token"),
        permissions: z
          .array(
            z.object({
              database: z
                .string()
                .describe("Database name or '*' for all databases"),
              action: z
                .enum(["read", "write"])
                .describe("Permission level for this database"),
            }),
          )
          .optional()
          .describe(
            "Array of permission objects. Use empty array for no-access token",
          ),
      }),
      handler: async (args) => {
        try {
          const cloudTokenService =
            influxService.getCloudTokenManagementService();

          const updateRequest: any = {};

          if (args.description !== undefined) {
            updateRequest.description = args.description;
          }

          if (args.permissions !== undefined) {
            updateRequest.permissions = args.permissions.map((p: any) => ({
              action: p.action,
              resource: p.database,
            }));
          }

          const result = await cloudTokenService.updateToken(
            args.token_id,
            updateRequest,
          );

          const permissionsList =
            result.permissions.length > 0
              ? result.permissions
                  .map((p) => `${p.action}:${p.resource}`)
                  .join(", ")
              : "No access";

          return {
            content: [
              {
                type: "text",
                text: `Database token updated successfully!\n\nDescription: ${result.description}\nToken ID: ${result.id}\nPermissions: ${permissionsList}\nCreated: ${result.createdAt}`,
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

    {
      name: "cloud_delete_database_token",
      description:
        "Delete a database token from InfluxDB Cloud-Dedicated cluster. This action cannot be undone.",
      inputSchema: {
        type: "object",
        properties: {
          token_id: {
            type: "string",
            description: "The ID of the token to delete",
          },
        },
        required: ["token_id"],
        additionalProperties: false,
      },
      zodSchema: z.object({
        token_id: z.string().describe("The ID of the token to delete"),
      }),
      handler: async (args) => {
        try {
          const cloudTokenService =
            influxService.getCloudTokenManagementService();
          await cloudTokenService.deleteToken(args.token_id);

          return {
            content: [
              {
                type: "text",
                text: `Database token '${args.token_id}' deleted successfully.`,
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

    // === End Cloud Token Management Tools ===
    // === Database and Health Tools ===

    {
      name: "list_databases",
      description:
        "List all databases in the InfluxDB instance. Returns database names, count, and status information.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      zodSchema: z.object({}),
      handler: async () => {
        try {
          const databases = await influxService.database.listDatabases();

          const databaseList = databases.map((db) => db.name).join(", ");
          const count = databases.length;

          return {
            content: [
              {
                type: "text",
                text: `Found ${count} database${count !== 1 ? "s" : ""} in InfluxDB instance:\n${databaseList || "None"}\n\nDatabase details:\n${JSON.stringify(databases, null, 2)}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error listing databases: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      },
    },

    {
      name: "health_check",
      description:
        "Check current connection status to the InfluxDB instance. Returns connection status, configuration, and /health and /ping results.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      zodSchema: z.object({}),
      handler: async () => {
        try {
          const connectionInfo = influxService.getConnectionInfo();
          const healthStatus = await influxService.getHealthStatus();
          const influxType =
            influxService["baseConnection"]?.["config"]?.influx?.type ||
            "unknown";
          const pingResult = await influxService.ping();
          const healthInfo = {
            timestamp: new Date().toISOString(),
            connection: {
              status: healthStatus.status === "pass" ? "healthy" : "failed",
              url: connectionInfo.url,
              hasToken: connectionInfo.hasToken,
              database: connectionInfo.database,
              type: influxType,
            },
            health: healthStatus,
            ping: pingResult,
          };

          const statusText =
            healthStatus.status === "pass" ? "✅ HEALTHY" : "❌ FAILED";
          const detailsText = JSON.stringify(healthInfo, null, 2);

          return {
            content: [
              {
                type: "text",
                text: `InfluxDB Health Check: ${statusText}\n\nConnection Details:\n${detailsText}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error during health check: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      },
    },

    // === End Database and Health Tools ===
  ];
}
