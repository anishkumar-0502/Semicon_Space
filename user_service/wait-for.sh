#!/bin/sh

# Extract host and port
hostport="$1"
shift

host=$(echo $hostport | cut -d: -f1)
port=$(echo $hostport | cut -d: -f2)

# Wait until the service is reachable
echo "⏳ Waiting for $host:$port..."
while ! nc -z "$host" "$port"; do
  sleep 1
done

echo "✅ $host:$port is available!"

# Run the next command
exec "$@"
