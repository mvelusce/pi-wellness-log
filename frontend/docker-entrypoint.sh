#!/bin/sh

# Generate runtime config from environment variables
cat > /usr/share/nginx/html/config.js << EOF
window.ENV = {
  BACKEND_PORT: "${BACKEND_PORT:-8000}",
  API_URL: "${VITE_API_URL:-}"
};
EOF

echo "Generated runtime config:"
cat /usr/share/nginx/html/config.js

# Start nginx
exec nginx -g 'daemon off;'

