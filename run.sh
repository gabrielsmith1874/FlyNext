#!/bin/bash

# Function to handle errors and prevent window from closing
handle_error() {
  echo "Error occurred. Press any key to exit..."
  read -n 1
  exit 1
}

# Function to clean up processes when exiting
cleanup() {
  echo "Shutting down servers..."
  # Return to original directory before exiting
  cd "$ORIGINAL_DIR"
  kill $flynext_pid $afs_pid 2>/dev/null
}

# Function to kill processes running on specific ports
kill_process_on_port() {
  local port=$1
  echo "Checking if port $port is in use..."
  
  # For Windows
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Improve Windows detection of processes on ports
    netstat -ano | grep ":$port " | grep "LISTENING" | while read line; do
      local pid=$(echo "$line" | awk '{print $5}')
      if [[ -n "$pid" && "$pid" =~ ^[0-9]+$ ]]; then
        echo "Killing process $pid using port $port..."
        taskkill //F //PID $pid 2>/dev/null || echo "Could not kill process $pid"
      fi
    done
  # For Unix/Linux/MacOS
  else
    local pid=$(lsof -i ":$port" -t)
    if [[ -n "$pid" ]]; then
      echo "Killing process $pid using port $port..."
      kill -9 $pid
    else
      echo "No process found using port $port"
    fi
  fi
}

# Set trap for clean exit
trap cleanup EXIT INT TERM
trap handle_error ERR

# Store original directory
ORIGINAL_DIR=$(pwd)

# Kill any existing processes on ports 3000 and 3001
kill_process_on_port 3000
kill_process_on_port 3001

# Start the FlyNext backend server on port 3000
echo "Starting FlyNext backend server on port 3000..."
PORT=3000 npm run dev &
flynext_pid=$!

# Verify the process started
sleep 2
if ! ps -p $flynext_pid > /dev/null 2>&1; then
  echo "Failed to start FlyNext server!"
  handle_error
fi

# Start the afs-main server on port 3001
echo "Starting afs-main server on port 3001..."
cd afs-main || { 
  echo "afs-main directory not found"; 
  handle_error; 
}
PORT=3001 npm run dev &
afs_pid=$!

# Verify the process started
sleep 2
if ! ps -p $afs_pid > /dev/null 2>&1; then
  echo "Failed to start afs-main server!"
  handle_error
fi

# Return to original directory
cd "$ORIGINAL_DIR"

echo "Both servers are running!"
echo "FlyNext: http://localhost:3000"
echo "afs-main: http://localhost:3001"
echo "Press Ctrl+C to stop all servers"

# Wait for both background processes
wait $flynext_pid $afs_pid || handle_error