# Changelog

All notable changes to the official InfluxDB MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-13

### Added

- Initial release of official InfluxDB MCP Server
- Full support for InfluxDB v3 Core and Enterprise
- Complete set of MCP tools for database operations:
  - Database management (create, list, delete)
  - Data querying with SQL support
  - Line protocol data writing
  - Token management (admin and resource tokens)
  - Health checking and diagnostics
- MCP resources for real-time status monitoring:
  - `influx-status`: Comprehensive health and connection status
  - `influx-config`: Current configuration details
- MCP prompts for common operations:
  - `list-databases`: Generate database listing prompts
  - `check-health`: Generate health check prompts
  - `query-recent-data`: Generate recent data query prompts
- Comprehensive help system with detailed guidance
- Support for multiple deployment methods:
  - Local development
  - NPM package
  - Docker container
- Example MCP configuration files for easy setup
- Complete TypeScript implementation with proper error handling
- Modular architecture with specialized services

### Features

- **Query Service**: Simplified response processing for InfluxDB v3 arrays
- **Write Service**: Direct line protocol support with comprehensive examples
- **Token Management**: Full CRUD operations for admin and resource tokens
- **Database Management**: Complete database lifecycle management
- **Help Service**: In-memory help content for optimal LLM performance
- **Health Monitoring**: Real-time status checking with detailed diagnostics

### Technical Details

- Built with @modelcontextprotocol/sdk v1.12.1
- Uses @influxdata/influxdb3-client for InfluxDB connectivity
- TypeScript with strict mode enabled
- ESM module support
- Comprehensive error handling and validation
- Supports stdio transport
