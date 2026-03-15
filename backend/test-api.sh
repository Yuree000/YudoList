#!/usr/bin/env bash
# Cross-platform smoke test wrapper.

BASE_URL="${1:-http://localhost:3001}" node test-api.js
