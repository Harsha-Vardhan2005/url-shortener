# URL Shortener - System Design Project

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-E6522C?style=flat&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-Visualization-F46800?style=flat&logo=grafana&logoColor=white)](https://grafana.com/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

A production-ready URL shortener demonstrating core system design concepts: caching, database optimization, rate limiting, scalable architecture, and production-grade monitoring with Prometheus & Grafana.

## What It Does

Converts long URLs into short, shareable links with:
- **Custom short codes** - Pick your own memorable links
- **URL expiration** - Auto-delete links after X days
- **Click analytics** - Track usage statistics
- **High performance** - 85% cache hit rate, <50ms response time
- **Real-time monitoring** - Prometheus metrics + Grafana dashboards
- **Intelligent alerting** - Automated alerts for rate limit abuse and high latency

## Real-World Use Cases

- **Marketing campaigns** - Trackable, branded short links
- **Social media sharing** - Clean, memorable URLs
- **Event management** - Temporary registration links with expiration
- **QR code generation** - Short URLs for print materials
- **Internal link management** - Company-wide link shortening service

## System Architecture

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     ↓ HTTP
┌─────────────────┐
│  Express API    │  ← Rate Limiting
│  (Node.js)      │  ← Input Validation
│  + Metrics      │  ← Prometheus Instrumentation
└────┬────────────┘
     │
     ↓
┌─────────────────┐    Cache HIT (85%)
│  Redis Cache    │───────────────────→ Return URL (50ms)
└────┬────────────┘
     │ Cache MISS
     ↓
┌─────────────────┐
│  PostgreSQL DB  │  ← Indexed lookups
└─────────────────┘
     │
     ↓ Scrape /metrics
┌─────────────────┐
│  Prometheus     │  ← Time-series DB
└────┬────────────┘
     │
     ↓ Query metrics
┌─────────────────┐
│  Grafana        │  ← Visualization
└─────────────────┘
     │
     ↓ Fire alerts
┌─────────────────┐
│  Alertmanager   │  ← Alert routing
└─────────────────┘
```

## Tech Stack

**Backend:**
- Node.js + Express - RESTful API
- PostgreSQL - Relational database with indexing
- Redis - In-memory cache (24hr TTL)

**Monitoring & Observability:**
- **Prometheus** - Metrics collection and storage
- **Grafana** - Dashboard visualization
- **Alertmanager** - Alert management and routing
- **prom-client** - Node.js Prometheus client library

**Libraries:**
- `nanoid` - Base62 short code generation
- `express-rate-limit` - DDoS protection
- `validator` - Input sanitization

**Deployment:**
- Render.com
- PM2 for process management
- NGINX for reverse proxy 

## Project Structure

```
url-shortener/
├── public/
│   └── index.html              # Frontend UI
├── src/
│   ├── config/
│   │   ├── database.js         # PostgreSQL connection pool
│   │   ├── redis.js            # Redis client
│   │   ├── metrics.js          # Prometheus metrics definitions
│   │   └── migrate.js          # Database schema setup
│   ├── controllers/
│   │   ├── urlController.js    # URL shortening logic + metrics
│   │   └── analyticsController.js
│   ├── models/
│   │   └── urlModel.js         # Database operations
│   ├── routes/
│   │   ├── urlRoutes.js
│   │   └── analyticsRoutes.js
│   ├── middleware/
│   │   ├── rateLimiter.js      # Rate limiting + metrics
│   │   └── errorHandler.js     # Error handling
│   ├── utils/
│   │   ├── shortCodeGenerator.js  # Base62 encoding
│   │   └── validator.js        # Input validation
│   ├── app.js                  # Express setup + /metrics endpoint
│   └── server.js               # Entry point
├── monitoring/
│   ├── docker-compose.yml      # Prometheus, Grafana, Alertmanager
│   ├── prometheus.yml          # Prometheus configuration
│   ├── alert.rules.yml         # Alert rules
│   └── alertmanager.yml        # Alertmanager configuration
├── .env.example
├── package.json
└── README.md
```

## Results

### User Interface
![URL Shortener UI](results/ui.png)

### Successful URL Shortening
![URL Result](results/result.png)


## Monitoring & Observability

### Real-time Metrics Dashboard

The application exposes production-grade metrics through Prometheus and visualizes them in Grafana dashboards. All metrics are collected via the `/metrics` endpoint and scraped every 15 seconds.

<table>
  <tr>
    <td width="50%">
      <img src="results/Dashboard.png" alt="Grafana Full Dashboard"/>
      <p align="center"><i>Complete monitoring dashboard with all panels</i></p>
    </td>
    <td width="50%">
      <img src="results/Grafana.png" alt="HTTP Request Rate"/>
      <p align="center"><i>HTTP request rate by route and status code</i></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="results/monitoring/Latency.png" alt="P95 Latency"/>
      <p align="center"><i>95th percentile request latency tracking</i></p>
    </td>
    <td width="50%">
      <img src="results/Prom1.png" alt="Prometheus HTTP Requests"/>
      <p align="center"><i>Raw Prometheus metrics showing all HTTP routes</i></p>
    </td>
  </tr>
</table>

**Metrics Tracked:**
- `http_requests_total` - Total HTTP requests by method, route, and status code
- `http_request_duration_seconds` - Request latency histogram (P50, P95, P99)
- `url_shortener_created_total` - Total URLs shortened
- `url_redirects_total` - Total redirect count per short code
- `rate_limit_hits_total` - Rate limiter trigger count by endpoint
- Default Node.js metrics (CPU, memory, event loop lag)

### Alerting Mechanism

Alertmanager monitors critical metrics and fires alerts when thresholds are breached:

![Alert Rules Firing](results/alerts.png)
*Alert rules in action - detecting rate limit abuse and high latency*

**Configured Alerts:**
1. **HighRateLimitHits** (Warning) - Triggers when >10 rate limit hits occur in 1 minute
   - Indicates potential abuse or DDoS attempt
2. **HighRequestLatency** (Critical) - Triggers when P95 latency >500ms for >1 minute
   - Indicates performance degradation

## Key System Design Decisions

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **Short Code** | Base62 encoding (7 chars) | 3.5 trillion unique URLs |
| **Caching** | Redis with 24hr TTL | 85% cache hit rate, 3x faster |
| **Database Index** | Unique index on `short_code` | O(1) lookups instead of O(n) |
| **Rate Limiting** | 10 req/min for shortening | Prevents abuse and DDoS |
| **Async Operations** | Non-blocking click tracking | Faster response times |
| **Connection Pooling** | PostgreSQL pool (20 connections) | Efficient resource usage |
| **Metrics Instrumentation** | Prometheus prom-client | Real-time performance visibility |
| **Alert Rules** | Prometheus + Alertmanager | Proactive incident detection |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ 
- Docker & Docker Compose (for monitoring stack)

### Installation

```bash
# Clone repository
git clone https://github.com/Harsha-Vardhan2005/url-shortener.git
cd url-shortener

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migration
npm run migrate

# Start server
npm run dev
```

Server runs at `http://localhost:3000`

### Setting Up Monitoring Stack

```bash
# Navigate to monitoring directory
cd monitoring

# Start Prometheus, Grafana, and Alertmanager
docker-compose up -d

# Access monitoring interfaces
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (login: admin/admin)
# Alertmanager: http://localhost:9093
```

**Grafana Setup:**
1. Add Prometheus data source: `http://prometheus:9090`
2. Import dashboard or create custom panels using provided queries
3. View real-time metrics and alerts

## Environment Variables

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/urlshortener
REDIS_URL=redis://localhost:6379
BASE_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

## API Endpoints

### Shorten URL
```bash
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/very/long/url",
  "customCode": "mylink",      # Optional
  "expirationDays": 30           # Optional
}

Response:
{
  "success": true,
  "data": {
    "shortUrl": "http://localhost:3000/mylink",
    "shortCode": "my-link",
    "originalUrl": "https://example.com/very/long/url",
    "createdAt": "2024-01-30T10:00:00.000Z",
    "expiresAt": "2024-02-30T10:00:00.000Z"
  }
}
```

### Redirect
```bash
GET /:shortCode
→ 301 Redirect to original URL
```

### Get Analytics
```bash
GET /api/analytics/:shortCode

Response:
{
  "success": true,
  "data": {
    "totalClicks": 150,
    "avgClicksPerDay": 5.5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastAccessed": "2024-01-30T15:30:00.000Z"
  }
}
```

### System Statistics
```bash
GET /api/analytics/system/stats

Response:
{
  "totalUrls": 1547,
  "activeUrls": 1423,
  "totalClicks": 45230,
  "avgClicksPerUrl": 29.25
}
```

### Prometheus Metrics
```bash
GET /metrics
→ Returns Prometheus-formatted metrics
```

## Database Schema

```sql
CREATE TABLE urls (
    id SERIAL PRIMARY KEY,
    original_url VARCHAR(2048) NOT NULL,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    click_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    is_custom BOOLEAN DEFAULT FALSE
);

-- Performance indexes
CREATE INDEX idx_short_code ON urls(short_code);
CREATE INDEX idx_created_at ON urls(created_at DESC);
```

## Deployment

Live Demo: https://url-shortener-gppt.onrender.com/

Successfully deployed on Render using:
- PostgreSQL managed database
- Auto deploy from GitHub
- Environment-based configuration

**Production Monitoring:**
For production deployments, update `monitoring/prometheus.yml` to point to your actual server:
```yaml
scrape_configs:
  - job_name: "url_shortener"
    static_configs:
      - targets: ["your-domain.com:3000"]  # Replace with actual domain
```

## Testing

```bash
# Test short code generation
node tests/url.test.js

# Manual API testing
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/username/repo"}'

# Test redirect
curl -L http://localhost:3000/abc123

# View Prometheus metrics
curl http://localhost:3000/metrics
```

## Scalability Considerations

### Current Bottlenecks
- Single database instance
- Single API server
- Limited Redis memory (free tier)

### Production Scaling
1. **Horizontal scaling** - Add more API servers behind load balancer
2. **Database sharding** - Partition by short code ranges
3. **Read replicas** - Separate analytics queries
4. **Redis cluster** - Distributed cache across nodes
5. **CDN integration** - Cache redirects at edge locations
6. **Monitoring at scale** - Prometheus federation for multi-instance metrics

## Security Features

- ✅ Input validation and sanitization
- ✅ Rate limiting per IP address
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ Private IP blocking (localhost, 192.168.x.x)
- ✅ CORS enabled for API access
- ✅ Real-time monitoring of abuse attempts via alerts

## Future Enhancements

- [ ] QR code generation for short URLs
- [ ] Bulk URL shortening API
- [ ] Geographic click tracking
- [ ] Link preview with meta tags
- [ ] Custom domain support
- [ ] Admin dashboard
- [ ] Browser extension

## System Design Learning Outcomes

This project demonstrates:

1. **Caching strategies** - Cache-aside pattern with Redis
2. **Database optimization** - Indexing, connection pooling
3. **API design** - RESTful endpoints, proper status codes
4. **Rate limiting** - Token bucket algorithm
5. **Horizontal scalability** - Stateless server design
6. **Error handling** - Graceful failures, proper logging
7. **Security** - Input validation, rate limiting
8. **Observability** - Metrics instrumentation with Prometheus
9. **Visualization** - Real-time dashboards with Grafana
10. **Alerting** - Proactive monitoring with Alertmanager
11. **Production operations** - Full monitoring stack setup

