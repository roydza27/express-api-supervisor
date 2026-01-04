import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();

app.use(cors({
  origin: "*", // allow any localhost dashboard or frontend to connect
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Metrics storage
const metrics = [];

// Metrics routes (must match exactly what dashboard calls)
app.get('/api/metrics/summary', (req, res) => {
  const total = metrics.length;
  const errors = metrics.filter(m => m.isError).length;
  const avgTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / (total || 1);

  res.json({
    totalRequests: total,
    errorRate: total ? (errors / total) * 100 : 0,
    avgResponseTime: avgTime
  });
});

app.get('/api/metrics/routes', (req, res) => {
  const stats = {};
  metrics.forEach(m => {
    if (!stats[m.route]) stats[m.route] = { count: 0, errors: 0, totalTime: 0 };
    stats[m.route].count++;
    stats[m.route].totalTime += m.responseTime;
    if (m.isError) stats[m.route].errors++;
  });

  const result = Object.entries(stats).map(([route, s]) => ({
    route,
    requestCount: s.count,
    avgResponseTime: s.totalTime / s.count,
    errorPercent: (s.errors / s.count) * 100
  }));

  res.json(result);
});

app.get('/api/metrics/export', (req, res) => {
  if (req.query.type === 'json') return res.json(metrics);

  const header = `route,method,status,responseTime,isError\n`;
  const rows = metrics.map(m => `${m.route},${m.method},${m.status},${m.responseTime},${m.isError}`).join('\n');
  res.send(header + rows);
});

// Make middleware insert into same array
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    metrics.push({
      route: req.path,
      method: req.method,
      status: res.statusCode,
      responseTime: Date.now() - start,
      isError: res.statusCode >= 400
    });
  });
  next();
});


// Global metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const metric = {
      route: req.route?.path || req.path,
      method: req.method,
      status: res.statusCode,
      responseTime,
      isError: res.statusCode >= 400
    };
    metrics.push(metric);

    // Also insert into DB
    try {
      db.prepare(`
        INSERT INTO analytics (route, method, status, response_time, is_error, timestamp, action)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        metric.route,
        metric.method,
        metric.status,
        metric.responseTime,
        metric.isError ? 1 : 0,
        new Date().toISOString(),
        'metrics_hit'
      );
    } catch {}
  });
  next();
});

// --- Your analytics endpoint (fixed null math) ---
app.get('/api/analytics', (req, res) => {
  try {
    const totalCommits = db.prepare('SELECT COUNT(*) as count FROM commits').get();
    const successfulPushes = db.prepare('SELECT COUNT(*) as count FROM commits WHERE push_success = 1').get();
    const totalFiles = db.prepare(`SELECT COALESCE(SUM(files_changed),0) as total FROM analytics WHERE action = 'commit_push'`).get();
    const totalLines = db.prepare(`SELECT COALESCE(SUM(lines_added),0) as added, COALESCE(SUM(lines_removed),0) as removed FROM analytics WHERE action = 'commit_push'`).get();
    const remoteSwitches = db.prepare(`SELECT COUNT(*) as count FROM analytics WHERE action = 'remote_switch'`).get();
    const recentCommits = db.prepare(`SELECT DATE(timestamp) as date FROM commits ORDER BY timestamp DESC LIMIT 30`).all();

    let streak = 0;
    if (recentCommits.length) {
      let lastDate = new Date().toISOString().split('T')[0];
      for (const c of recentCommits) {
        if (c.date === lastDate) {
          streak++;
          const d = new Date(lastDate);
          d.setDate(d.getDate() - 1);
          lastDate = d.toISOString().split('T')[0];
        } else break;
      }
    }

    const timeSaved = (totalCommits?.count ?? 0) * 6;
    const successRate = totalCommits.count > 0
      ? ((successfulPushes.count / totalCommits.count) * 100).toFixed(1)
      : '0';

    res.json({
      totalCommits: totalCommits?.count ?? 0,
      successfulPushes: successfulPushes?.count ?? 0,
      totalFilesChanged: totalFiles?.total ?? 0,
      linesAdded: totalLines?.added ?? 0,
      linesRemoved: totalLines?.removed ?? 0,
      remoteSwitches: remoteSwitches?.count ?? 0,
      commitStreak: streak,
      timeSavedSeconds: timeSaved,
      pushSuccessRate: successRate
    });

  } catch (error) {
    res.json({
      totalCommits: 0,
      successfulPushes: 0,
      totalFilesChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
      remoteSwitches: 0,
      commitStreak: 0,
      timeSavedSeconds: 0,
      pushSuccessRate: '0',
      error: error.message
    });
  }
});

// --- Activity logs endpoint ---
app.get('/api/logs', (req, res) => {
  try {
    const logs = db.prepare(`SELECT * FROM analytics ORDER BY timestamp DESC LIMIT 50`).all();
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ logs: [], error: error.message });
  }
});

// Test routes
app.get('/api/test/fast', (req, res) => res.send('Fast'));
app.get('/api/test/slow', (req, res) => setTimeout(() => res.send('Slow'), 900));
app.get('/api/test/error', (req, res) => res.status(500).send('Fail'));

// Start server
app.listen(3002, () => console.log('Server running on 3002'));
