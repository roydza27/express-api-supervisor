import React, { useState, useEffect } from "react";
import axios from "axios";
import SummaryCard from "../components/SummaryCard";
import MetricsChart from "../components/MetricsChart";
import RouteTable from "../components/RouteTable";

export default function Dashboard() {
  const [port, setPort] = useState(3002);
  const [backendOnline, setBackendOnline] = useState(false);
  const [summary, setSummary] = useState({});
  const [routes, setRoutes] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [logs, setLogs] = useState([]);

  const BASE = `http://localhost:3001`;

  useEffect(() => {
    const interval = setInterval(() => {
      axios.get(`${BASE}/api/metrics/summary`)
        .then(res => {
          setSummary(res.data);
          setBackendOnline(true);
        })
        .catch(() => setBackendOnline(false));

      axios.get(`${BASE}/api/metrics/routes`)
        .then(res => setRoutes(res.data))
        .catch(() => setRoutes([]));

      axios.get(`${BASE}/api/logs`)
        .then(res => setLogs(res.data.logs || []))
        .catch(() => setLogs([]));

      axios.get(`${BASE}/api/metrics/export?type=json`)
        .then(res => setLogs(res.data))
        .catch(() => setLogs([]));

    }, 3000);

    return () => clearInterval(interval);
  }, [port]);

  useEffect(() => {
    if (Array.isArray(routes)) {
      setChartData(routes.map(r => ({
        route: r.route,
        responseTime: r.avgResponseTime,
        errorPercent: r.errorPercent,
      })));
    }
  }, [routes]);

  return (
    <div className="p-6 space-y-6">
      {/* Port switcher */}
      <div className="flex gap-2 items-center">
        {/* <input
          type="number"
          className="border p-2 rounded-xl w-24"
          value={port}
          onChange={e => setPort(e.target.value)}
        /> */}
        <span className="text-sm">{backendOnline ? "Backend Connected" : "Backend Offline"}</span>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard title="Total API Calls" value={summary.totalRequests || 0} />
        <SummaryCard title="Avg Response Time" value={(summary.avgResponseTime || 0) + " ms"} />
        <SummaryCard title="Error Rate" value={(summary.errorRate || 0).toFixed(1) + "%"} />
      </div>

      {/* API performance chart */}
      <MetricsChart data={chartData} />

      {/* Route performance table */}
      <RouteTable routes={routes} />

      {/* Recent API call + errors log */}
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
