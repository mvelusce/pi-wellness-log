# 🎯 Habits Tracker

A self-hosted application for tracking habits and mood with correlation analysis. Track your daily habits, log your mood throughout the day, and discover patterns between your habits and how you feel.

## ✨ Features

- **📊 Habit Tracking**: Create and track multiple daily habits
- **😊 Mood Logging**: Record your mood, energy, and stress levels throughout the day
- **📈 Correlation Analysis**: Discover statistical relationships between your habits and mood
- **📱 Progressive Web App**: Works on web and can be installed on Android devices
- **🏠 Self-Hosted**: Your data stays on your server
- **🎨 Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- **📉 Data Visualization**: Interactive charts and heatmaps to visualize your progress
- **🔒 Privacy-First**: SQLite database, no external services required

## 🏗️ Architecture

- **Backend**: FastAPI (Python) + SQLite
- **Frontend**: React + TypeScript + Vite
- **Analytics**: Pandas + SciPy for correlation analysis
- **Deployment**: Docker + Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Alternatively: Python 3.11+ and Node.js 18+ for local development

### Option 1: Using Pre-built Images (Easiest for Deployment)

**Perfect for Raspberry Pi and production deployments!**

1. Download the deployment files:
```bash
mkdir -p ~/habits-tracker && cd ~/habits-tracker

wget -O docker-compose.yml https://raw.githubusercontent.com/mvelusce/pi-habits-tracker/master/docker-compose.prod.yml

wget -O .env https://raw.githubusercontent.com/mvelusce/pi-habits-tracker/master/.env.example
```

2. Create data directory:
```bash
mkdir -p data
```

3. Start the application:
```bash
docker compose up -d
```

4. Access the application:
- Frontend: http://localhost:9797
- Backend API: http://localhost:9696

**📖 Full deployment guide**: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for:
- Reverse proxy configuration (Nginx, Traefik)
- SSL/HTTPS setup
- Production deployment best practices
- Troubleshooting common issues

**Note:** The frontend automatically detects the API URL based on your `.env` configuration. No separate configuration needed!

### Option 2: Building from Source (For Development)

1. Clone the repository:
```bash
git clone https://github.com/mvelusce/pi-habits-tracker.git
cd pi-habits-tracker
```

2. Create environment file (optional, to customize ports):
```bash
cat > .env << 'EOF'
BACKEND_PORT=9696
FRONTEND_PORT=9797
EOF
```

3. Start the application:
```bash
docker compose up -d
```

4. Access the application:
- Frontend: http://localhost:9797
- Backend API: http://localhost:9696
- API Documentation: http://localhost:9696/docs

5. Stop the application:
```bash
docker compose down
```

### Option 3: Local Development

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend:
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 9696
```

The API will be available at http://localhost:9696

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
echo "VITE_API_URL=http://localhost:9696" > .env
```

4. Run the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## 📱 Installing as PWA on Android

1. Open the app in Chrome on your Android device
2. Tap the menu (⋮) and select "Install app" or "Add to Home screen"
3. The app will be installed and can be launched like a native app

## 📖 Usage Guide

### Creating Habits

1. Navigate to the "Habits" tab
2. Click "New Habit"
3. Enter a name, description, choose a color and icon
4. Save your habit

### Tracking Habits

1. Go to the "Dashboard" tab
2. Check off habits as you complete them
3. Use the date selector to view or update past dates

### Logging Mood

1. Navigate to the "Mood" tab
2. Click "Log Your Mood"
3. Rate your mood (1-10), energy, and stress levels
4. Optionally add notes and tags
5. Save the entry

You can log multiple mood entries per day to track changes throughout the day.

### Viewing Analytics

1. Go to the "Analytics" tab
2. Select a time period (7, 14, 30, 60, or 90 days)
3. View:
   - Mood trends over time
   - Habit-mood correlations
   - Statistical significance indicators
   - Insights and patterns

### Understanding Correlations

- **Correlation Range**: -1.0 to +1.0
  - **Positive** (0 to +1): Habit completion associated with better mood
  - **Negative** (-1 to 0): Habit completion associated with worse mood
  - **Near Zero**: Little to no relationship

- **Strength**:
  - 0.7+: Strong correlation
  - 0.4-0.7: Moderate correlation
  - 0.2-0.4: Weak correlation
  - < 0.2: Negligible

- **Significance**: p-value < 0.05 indicates statistically significant results

## 🔧 Configuration

### Environment Variables

The application can be configured using a `.env` file in the root directory:

```env
# Backend port (default: 9696)
BACKEND_PORT=9696

# Frontend port (default: 9797)
FRONTEND_PORT=9797

# API URL for frontend (used during build)
VITE_API_URL=http://localhost:9696
```

**Note**: When using pre-built images from GitHub Container Registry, the `VITE_API_URL` is baked into the frontend at build time. For custom backend URLs, you'll need to build the frontend yourself. See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

### Database

The application uses SQLite by default. The database file is stored at:
- Docker: `./data/habits_tracker.db`
- Local: `./backend/habits_tracker.db`

To backup your data, simply copy this file.

## 🛠️ Development

### Project Structure

```
habits-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── database.py       # Database configuration
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   └── routers/
│   │       ├── habits.py     # Habit endpoints
│   │       ├── mood.py       # Mood endpoints
│   │       └── analytics.py  # Analytics endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # Utilities and API client
│   │   └── store/           # State management
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

### API Documentation

The FastAPI backend provides interactive API documentation:
- Swagger UI: http://localhost:9696/docs
- ReDoc: http://localhost:9696/redoc

### Adding New Features

1. **Backend**: Add endpoints in `backend/app/routers/`
2. **Frontend**: Create components in `frontend/src/components/`
3. **API Client**: Update `frontend/src/lib/api.ts`

## 📊 Database Schema

### Tables

- **habits**: Habit definitions (name, color, icon, etc.)
- **habit_entries**: Daily habit completion records
- **mood_entries**: Mood, energy, and stress logs

## 🔒 Security Considerations

- This is a single-user application designed for self-hosting
- No authentication is implemented by default
- For internet-facing deployments, consider adding:
  - Reverse proxy with HTTPS (nginx, Caddy)
  - Authentication layer
  - Rate limiting
  - Firewall rules

## 🚀 Deployment Options

### Self-Hosting Options

1. **Raspberry Pi**: Perfect for home server deployment
2. **VPS** (DigitalOcean, Linode, etc.): Cloud deployment
3. **Home Server**: Using Docker on any Linux machine
4. **NAS**: Many NAS devices support Docker

### Production Recommendations

1. Use a reverse proxy (nginx, Caddy) for HTTPS
2. Set up regular database backups
3. Configure proper logging
4. Monitor resource usage
5. Set up health checks

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📝 License

MIT License - Feel free to use and modify for your own needs.

## 🐛 Troubleshooting

### Backend won't start
- Check Python version (3.11+)
- Verify all dependencies are installed
- Check port 8000 is available

### Frontend won't connect to backend
- Verify backend is running at http://localhost:9696
- Check VITE_API_URL in your .env file
- Ensure CORS is properly configured
- If using pre-built images on a remote server, see [DEPLOYMENT.md](DEPLOYMENT.md)

### Docker issues
- Run `docker compose logs` to see error messages
- Ensure ports 9696 and 9797 are available
- Try `docker compose down -v` to reset volumes
- If pulling from GHCR fails, check that images exist: `docker pull ghcr.io/mvelusce/pi-habits-tracker-backend:latest`

### Database errors
- Check write permissions for the database file
- Verify SQLite is properly installed
- Try deleting and recreating the database (will lose data!)

## 📧 Support

For issues or questions, please open an issue on the repository.

## 🎯 Roadmap

Potential future enhancements:
- [ ] Multi-user support with authentication
- [ ] Data export/import features
- [ ] More advanced analytics (time-lagged correlations)
- [ ] Habit categories and goals
- [ ] Notifications and reminders
- [ ] Dark mode
- [ ] Calendar heatmap view
- [ ] Mobile native apps (React Native)
- [ ] Integration with fitness trackers

---

**Happy Tracking! 🎉**

