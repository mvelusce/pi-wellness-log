# Deployment Guide

## Quick Install (Recommended)

Install using pre-built Docker images from GitHub Container Registry:

### One-Line Install

```bash
curl -sSL https://raw.githubusercontent.com/mvelusce/pi-habits-tracker/master/install.sh | bash
```

### Manual Install

```bash
# Download docker-compose.yml
wget -O docker-compose.yml https://raw.githubusercontent.com/mvelusce/pi-habits-tracker/master/docker-compose.prod.yml

# Download .env.example
wget -O .env https://raw.githubusercontent.com/mvelusce/pi-habits-tracker/master/.env.example

# Create data directory
mkdir -p data

# Start services
docker-compose up -d
```

## Access Your App

After installation:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Docker Images

Pre-built images are available on GitHub Container Registry:
- `ghcr.io/mvelusce/habits-tracker-backend:latest`
- `ghcr.io/mvelusce/habits-tracker-frontend:latest`

### Supported Platforms
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM, Raspberry Pi, Apple Silicon)

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Port Configuration
FRONTEND_PORT=9797
BACKEND_PORT=9898

# Database Configuration
DATABASE_URL=sqlite:///./data/habits_tracker.db

# Optional: Custom API URL (only if using separate subdomains)
# VITE_API_URL=https://api.your-domain.com
```

**How it works:**

The frontend automatically configures the API URL by reading `BACKEND_PORT` from your `.env` file:
- No separate frontend `.env` file needed
- No hardcoded URLs
- Change ports in one place, everything updates automatically

**For PostgreSQL:**

```bash
DATABASE_URL=postgresql://user:password@postgres:5432/habits_tracker
```

**Advanced: Custom API URL**

Only set `VITE_API_URL` if you need complete control (e.g., separate subdomain):

```bash
VITE_API_URL=https://api.your-domain.com
```

When set, this overrides automatic port-based detection.

## Deployment Options

### 1. Local Machine

```bash
# Default installation
./install.sh
```

### 2. Remote Server (VPS, Cloud)

```bash
# SSH into your server
ssh user@your-server.com

# Run installation
curl -sSL https://raw.githubusercontent.com/mvelusce/pi-habits-tracker/master/install.sh | bash

# Configure firewall
sudo ufw allow 3000  # Frontend
sudo ufw allow 8000  # Backend API
```

### 3. Raspberry Pi

Works on all Raspberry Pi models with Docker support:

```bash
# Install Docker if needed
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install habits tracker
curl -sSL https://raw.githubusercontent.com/mvelusce/pi-habits-tracker/master/install.sh | bash
```

### 4. Behind Reverse Proxy (Nginx, Traefik)

The frontend automatically detects the API URL based on the port configuration in your `.env` file.

#### Option A: Path-Based Routing (Recommended)

Route both frontend and backend through a single domain using path-based routing.

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name habits.yourdomain.com;
    
    # Frontend - all requests
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend - API requests
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend - health check
    location /health {
        proxy_pass http://localhost:8000/health;
    }
}
```

**Note:** For path-based routing, you'll need to set `VITE_API_URL` in your `.env`:

```bash
VITE_API_URL=https://habits.yourdomain.com
```

#### Option B: Port-Based Routing

If your reverse proxy doesn't support path-based routing well, use port-based routing:

1. Expose both frontend and backend on different ports
2. The frontend automatically detects the backend port from your `.env` file

**Example `.env`:**
```bash
FRONTEND_PORT=9797
BACKEND_PORT=9898
```

**Access:**
- Frontend: `https://yourdomain.com:9797`
- Backend: `https://yourdomain.com:9898` (automatic)

The frontend will automatically make API calls to the backend port.

#### Option C: Separate Subdomains

#### Traefik Labels

Add to `docker-compose.yml`:

```yaml
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.habits-frontend.rule=Host(`habits.yourdomain.com`)"
      - "traefik.http.services.habits-frontend.loadbalancer.server.port=80"
  
  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.habits-api.rule=Host(`api.habits.yourdomain.com`)"
      - "traefik.http.services.habits-api.loadbalancer.server.port=8000"
```

## SSL/TLS (HTTPS)

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d habits.yourdomain.com -d api.habits.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Database

### SQLite (Default)

Data stored in: `./data/habits_tracker.db`

**Backup:**
```bash
docker-compose exec backend sqlite3 /app/data/habits_tracker.db ".backup /app/data/backup.db"
```

### PostgreSQL (Production)

1. Update `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=habits_tracker
      - POSTGRES_USER=habits
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  backend:
    environment:
      - DATABASE_URL=postgresql://habits:your_secure_password@postgres:5432/habits_tracker
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## Updating

### Pull Latest Images

```bash
docker-compose pull
docker-compose up -d
```

### Specific Version

```bash
# Edit docker-compose.yml
backend:
  image: ghcr.io/mvelusce/habits-tracker-backend:v1.0.0

frontend:
  image: ghcr.io/mvelusce/habits-tracker-frontend:v1.0.0
```

## Backup & Restore

### Backup

```bash
# Full backup
tar -czf habits-backup-$(date +%Y%m%d).tar.gz data/

# Database only
cp data/habits_tracker.db data/habits_tracker_backup_$(date +%Y%m%d).db
```

### Restore

```bash
# From full backup
tar -xzf habits-backup-20251206.tar.gz

# From database backup
cp data/habits_tracker_backup_20251206.db data/habits_tracker.db
docker-compose restart backend
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Check container status
docker-compose ps
```

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose logs

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Frontend shows "No data" or API errors

**Symptom:** Frontend loads but shows empty dashboard, no habits, or network errors in browser console.

**Diagnosis:**
1. Open browser DevTools (F12) → Console tab
2. Look for red errors mentioning "network", "CORS", or "api"
3. Check the Network tab to see what URL the frontend is trying to reach
4. Note what URL failed (e.g., `https://domain.com:9898/api/habits`)

**Solutions by deployment type:**

**For port-based routing:**
```bash
# Test if backend is accessible (adjust port to your BACKEND_PORT)
curl http://localhost:9898/health
# Should return: {"status":"healthy"}

# Test if data is in backend
curl http://localhost:9898/api/habits
# Should return: [...list of habits...]
```

If these fail:
- Check that BACKEND_PORT in `.env` matches your backend container port mapping
- Verify backend container is running: `docker ps | grep backend`
- Check firewall allows the backend port

**For path-based routing (Nginx):**
```bash
# Test API through reverse proxy
curl https://yourdomain.com/api/habits
# Should return: [...list of habits...]

# Test backend directly
curl http://localhost:8000/api/habits
```

If direct test works but reverse proxy fails:
- Check nginx config routes `/api/*` to backend
- Reload nginx: `sudo nginx -s reload`

**General checks:**
```bash
# Verify database file exists
docker exec habits-tracker-backend ls -la /app/data/habits_tracker.db

# Check backend logs
docker logs habits-tracker-backend

# Restart backend
docker restart habits-tracker-backend
```

### Database locked error

```bash
# Stop all containers
docker-compose down

# Start again
docker-compose up -d
```

### Images not found (403 error)

Images are public, but if you get errors:

```bash
# Login to GitHub Container Registry (optional)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull images
docker-compose pull
```

### Port already in use

Edit `docker-compose.yml` to use different ports:

```yaml
ports:
  - "3001:80"  # Frontend on port 3001
  - "8001:8000"  # Backend on port 8001
```

## Security Considerations

1. **Change default ports** in production
2. **Use HTTPS** with valid SSL certificates
3. **Firewall**: Only expose necessary ports
4. **Strong passwords** for PostgreSQL
5. **Regular backups**
6. **Keep images updated**: `docker-compose pull`

## Performance Tips

1. **Use PostgreSQL** for better concurrency
2. **Add Redis** for caching (future enhancement)
3. **Limit logs**: Add to docker-compose.yml:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## Need Help?

- **Issues**: https://github.com/mvelusce/habits-tracker/issues
- **Discussions**: https://github.com/mvelusce/habits-tracker/discussions
- **Documentation**: Check README.md

---

Happy tracking! 🎯

