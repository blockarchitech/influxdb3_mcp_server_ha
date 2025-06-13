# InfluxDB MCP Server

Official Model Context Protocol (MCP) server for InfluxDB integration. Provides tools, resources, and prompts for interacting with InfluxDB v3 (Core/Enterprise) via MCP clients.

---

## Prerequisites

- **InfluxDB Instance**: URL and operator token
- **Node.js**: v18 or newer (for npm/npx usage)
- **npm**: v9 or newer (for npm/npx usage)
- **Docker**: (for Docker-based setup)

---

## Available Tools

| Tool Name                   | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| `test_connection`           | Test connectivity to your InfluxDB instance                    |
| `list_databases`            | List all available databases in the instance                   |
| `get_connection_info`       | Get connection details for the configured InfluxDB instance    |
| `create_database`           | Create a new database (name restrictions apply)                |
| `delete_database`           | Delete a database by name (irreversible)                       |
| `execute_query`             | Run a SQL query against a database (supports multiple formats) |
| `write_line_protocol`       | Write data using InfluxDB line protocol                        |
| `get_measurements`          | List all measurements (tables) in a database                   |
| `get_measurement_schema`    | Get schema (columns/types) for a measurement/table             |
| `create_admin_token`        | Create a new admin token (full permissions)                    |
| `list_admin_tokens`         | List all admin tokens (with optional filtering)                |
| `create_resource_token`     | Create a resource token for specific DBs and permissions       |
| `list_resource_tokens`      | List all resource tokens (with filtering and ordering)         |
| `delete_token`              | Delete a token by name                                         |
| `regenerate_operator_token` | Regenerate the operator token (dangerous/irreversible)         |
| `get_help`                  | Get help and troubleshooting guidance for InfluxDB operations  |
| `health_check`              | Check InfluxDB connection and health status                    |

---

## Available Resources

| Resource Name      | Description                                |
| ------------------ | ------------------------------------------ |
| `influx-config`    | Read-only access to InfluxDB configuration |
| `influx-status`    | Real-time connection and health status     |
| `influx-databases` | List of all databases in the instance      |

---

## Setup & Integration Guide

### 1. Environment Variables

You must provide at least:

- `INFLUX_DB_INSTANCE_URL` (e.g. `http://localhost:8181/`)
- `INFLUX_DB_TOKEN`
- `INFLUX_DB_PRODUCT_TYPE` (`core` or `enterprise`)

Example `.env`:

```env
INFLUX_DB_INSTANCE_URL=http://localhost:8181/
INFLUX_DB_TOKEN=your_influxdb_token_here
INFLUX_DB_PRODUCT_TYPE=core
```

---

### 2. Integration with MCP Clients

#### A. Local (npm install & run)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Build the server:**
   ```bash
   npm run build
   ```
3. **Configure your MCP client** to use the built server. Example (see `example-local.mcp.json`):
   ```json
   {
     "mcpServers": {
       "influxdb": {
         "command": "node",
         "args": ["/path/to/influx-mcp-standalone/build/index.js"],
         "env": {
           "INFLUX_DB_INSTANCE_URL": "http://localhost:8181/",
           "INFLUX_DB_TOKEN": "<YOUR_INFLUXDB_TOKEN>",
           "INFLUX_DB_PRODUCT_TYPE": "core"
         }
       }
     }
   }
   ```

#### B. Local (npx, no install/build required)

1. **Run directly with npx** (after publishing to npm, won't work yet):
   ```json
   {
     "mcpServers": {
       "influxdb": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-influxdb"],
         "env": {
           "INFLUX_DB_INSTANCE_URL": "http://localhost:8181/",
           "INFLUX_DB_TOKEN": "<YOUR_INFLUXDB_TOKEN>",
           "INFLUX_DB_PRODUCT_TYPE": "core"
         }
       }
     }
   }
   ```

#### C. Docker

Before running the Docker integration, you must build the Docker image:

```bash
# Option 1: Use docker compose (recommended)
docker compose build
# Option 2: Use npm script
npm run docker:build
```

**a) Docker with remote InfluxDB instance** (see `example-docker.mcp.json`):

```json
{
  "mcpServers": {
    "influxdb": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "INFLUX_DB_INSTANCE_URL",
        "-e",
        "INFLUX_DB_TOKEN",
        "-e",
        "INFLUX_DB_PRODUCT_TYPE",
        "mcp/influxdb"
      ],
      "env": {
        "INFLUX_DB_INSTANCE_URL": "http://remote-influxdb-host:8181/",
        "INFLUX_DB_TOKEN": "<YOUR_INFLUXDB_TOKEN>",
        "INFLUX_DB_PRODUCT_TYPE": "core"
      }
    }
  }
}
```

**b) Docker with InfluxDB running in Docker on the same machine** (see `example-docker.mcp.json`):

Use `host.docker.internal` as the InfluxDB URL so the MCP server container can reach the InfluxDB container:

```json
{
  "mcpServers": {
    "influxdb": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--add-host=host.docker.internal:host-gateway",
        "-e",
        "INFLUX_DB_INSTANCE_URL",
        "-e",
        "INFLUX_DB_TOKEN",
        "-e",
        "INFLUX_DB_PRODUCT_TYPE",
        "influxdb-mcp-server"
      ],
      "env": {
        "INFLUX_DB_INSTANCE_URL": "http://host.docker.internal:8181/",
        "INFLUX_DB_TOKEN": "<YOUR_INFLUXDB_TOKEN>",
        "INFLUX_DB_PRODUCT_TYPE": "enterprise"
      }
    }
  }
}
```

---

## Example Usage

- Use your MCP client to call tools, resources, or prompts as described above.
- See the `example-*.mcp.json` files for ready-to-use configuration templates for each integration method.

---

## Support & Troubleshooting

- Use the `get_help` tool for built-in help and troubleshooting.
- For connection issues, check your environment variables and InfluxDB instance status.
- For advanced configuration, see the comments in the example `.env` and MCP config files.

---

## License

[MIT](LICENSE)
