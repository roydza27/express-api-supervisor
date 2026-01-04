import React, { useState, useEffect } from "react";
import axios from "axios";
import SummaryCard from "../components/SummaryCard";
import MetricsChart from "../components/MetricsChart";
import RouteTable from "../components/RouteTable";

export default function Dashboard() {
  const [port] = useState(3001); // supervising RepoSense backend
  const [backendOnline, setBackendOnline] = useState(false);

  const [summary, setSummary] = useState({
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
  });

  const [routes, setRoutes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);

  const BASE = `http://localhost:${port}`;

  // Noise filter helper
  const isNoise = (route) =>
    !route || // null/undefined safety
    route.includes("favicon") ||
    route.includes("/metrics") ||
    route.startsWith("/api/metrics");

  useEffect(() => {
    const fetchMetrics = async () => {
      // Check summary
      try {
        const res1 = await axios.get(`${BASE}/api/metrics/summary`);
        setSummary({
          totalRequests: res1.data.totalRequests ?? 0,
          avgResponseTime: res1.data.avgResponseTime ?? 0,
          errorRate: res1.data.errorRate ?? 0,
        });
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }

      // Check grouped route stats
      try {
        const res2 = await axios.get(`${BASE}/api/metrics/routes`);
        const data = Array.isArray(res2.data) ? res2.data : [];
        const filtered = data.filter((r) => !isNoise(r.route));
        setRoutes(filtered);
      } catch {
        setRoutes([]);
      }

      // Get raw logs for UI (not overwriting summary)
      try {
        const res3 = await axios.get(`${BASE}/api/metrics/export?type=json`);
        const data = Array.isArray(res3.data) ? res3.data : [];
        const filteredLogs = data.filter((m) => !isNoise(m.route));
        setLogs(filteredLogs);
      } catch {
        setLogs([]);
      }
    };

    // First call immediately
    fetchMetrics();

    // Then repeat every 3 seconds
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, [port]);

  // Build chart data whenever route stats update
  useEffect(() => {
    setChartData(
      routes.map((r) => ({
        route: r.route,
        responseTime: r.avgResponseTime,
        hits: r.hits ?? r.requestCount ?? 0,
        errorPercent: r.errorPercent ?? r.errorPercent ?? 0,
        isSlow: r.isSlow ?? r.isSlow ?? false,
      }))
    );
  }, [routes]);

  return (
    <div className="p-6 space-y-6">

      {/* Backend status */}
      <div className="flex gap-2 items-center">
        <span className="text-sm">
          {backendOnline ? "Backend Connected" : "Backend Offline"}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard title="Total API Calls" value={summary.totalRequests ?? 0} />
        <SummaryCard
          title="Avg Response Time"
          value={(summary.avgResponseTime ?? 0).toFixed(1) + " ms"}
        />
        <SummaryCard
          title="Error Rate"
          value={(summary.errorRate ?? 0).toFixed(1) + "%"}
        />
      </div>

      {/* Chart */}
      <MetricsChart data={chartData} />

      {/* Table */}
      <RouteTable routes={routes} />

      {/* Logs */}
      <div className="bg-black/5 p-4 rounded-2xl border max-h-60 overflow-auto text-sm">
        <h3 className="font-semibold mb-2">Recent API Logs & Errors</h3>
        {logs.length === 0 && "No logs yet..."}
        {logs.map((log, i) => (
          <div key={i} className="border-b py-1 flex justify-between">
            <span>{log.method} {log.route} → {log.status}</span>
            <span>{log.isError ? "❌ ERROR" : log.responseTime + " ms"}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
