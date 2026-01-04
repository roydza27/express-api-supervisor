import express from "express";
import cors from "cors";
import db from "./db.js"; // your current DB (metrics.db) path inside backend-metrics project

const app = express();

app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

// Metrics storage in RAM
const metrics = [];

// Single global middleware to capture ALL incoming API traffic
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const responseTime = Date.now() - start;
    const isError = res.statusCode >= 400;

    const metric = {
      route: req.path,
      method: req.method,
      status: res.statusCode,
      responseTime,
      isError
    };

    metrics.push(metric);

    // Insert into SQLite DB (api_metrics table)
    try {
      db.prepare(`
        INSERT INTO api_metrics (route, method, status, response_time, is_error)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        metric.route,
        metric.method,
        metric.status,
        metric.responseTime,
        metric.isError ? 1 : 0
      );
    } catch (err) {
      console.error("DB insert failed:", err.message);
    }
  });
  next();
});

// Grouped summary endpoint
app.get("/api/metrics/summary", (req, res) => {
  const total = metrics.length;
  const errors = metrics.filter(m => m.isError).length;
  const avgTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / (total || 1);

  res.json({
    totalRequests: total,
    avgResponseTime: avgTime,
    errorRate: total ? (errors/total)*100 : 0
  });
});

// Group route stats properly
app.get("/api/metrics/routes", (req, res) => {
  const grouped = {};
  metrics.forEach(m => {
    if (!grouped[m.route]) grouped[m.route] = { hits: 0, errors: 0, totalTime: 0 };
    grouped[m.route].hits++;
    grouped[m.route].totalTime += m.responseTime;
    if (m.isError) grouped[m.route].errors++;
  });

  const result = Object.entries(grouped).map(([route, d]) => ({
    route,
    hits: d.hits,
    avgTime: d.totalTime / d.hits,
    errorPercent: (d.errors / d.hits) * 100,
    isSlow: (d.totalTime / d.hits) > 500
  }));

  res.json(result);
});

// Export raw metrics
app.get("/api/metrics/export", (req, res) => {
  res.json(metrics);
});

// Test traffic generators
app.get("/api/test/fast", (req, res) => res.send("Fast"));
app.get("/api/test/slow", (req, res) => setTimeout(() => res.send("Slow"), 900));
app.get("/api/test/error", (req, res) => res.status(500).send("Fail"));

// Start server on 3002
app.listen(3002, () => console.log("Server running on 3002")); 
