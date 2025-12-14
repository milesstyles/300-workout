#!/bin/bash
# Start the 300 Workout Tracker server

cd "$(dirname "$0")"

# Kill any existing server on port 8080
lsof -ti:8080 | xargs kill 2>/dev/null

# Start the server
python3 server.py
