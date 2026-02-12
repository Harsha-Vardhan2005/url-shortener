const client = require('prom-client');

// Creates default metrics like CPU, memory, event loop lag etc.
// free metrics, no extra work needed
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'url_shortener_' });

// ─── Custom Metrics ───────────────────────────────────────────

// 1. Total HTTP requests counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// 2. HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5], // in seconds
});

// 3. URL shortener created counter
const urlsCreatedTotal = new client.Counter({
  name: 'url_shortener_created_total',
  help: 'Total number of short URLs created',
});

// 4. URL redirects counter
const urlRedirectsTotal = new client.Counter({
  name: 'url_redirects_total',
  help: 'Total number of URL redirects',
  labelNames: ['short_code'],
});

// 5. Rate limit hits counter
const rateLimitHitsTotal = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint'],
});

module.exports = {
  client,
  httpRequestsTotal,
  httpRequestDuration,
  urlsCreatedTotal,
  urlRedirectsTotal,
  rateLimitHitsTotal,
};