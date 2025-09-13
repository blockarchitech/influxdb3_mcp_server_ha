#!/usr/bin/env bash

CONFIG_PATH=/data/options.json
INFLUX_DB_INSTANCE_URL="$(bashio::config 'instance_url')"
INFLUX_DB_TOKEN="$(bashio::config 'token')"
INFLUX_DB_PRODUCT_TYPE="$(bashio::config 'product_type')"

if [ -z "$INFLUX_DB_INSTANCE_URL" ] || [ -z "$INFLUX_DB_TOKEN" ] || [ -z "$INFLUX_DB_PRODUCT_TYPE" ]; then
    echo "One or more required configuration values are missing."
    echo "Please ensure 'instance_url', 'token', and 'product_type' are set in the configuration."
    exit 1
fi

mcp-proxy --port 8080 node build/index.js &