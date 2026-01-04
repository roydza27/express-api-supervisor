export default function RouteTable({ routes }) {
  if (!Array.isArray(routes)) return <div>No route data...</div>;

  return (
    <table className="w-full border rounded-xl text-sm">
      <thead>
        <tr className="border-b">
          <th className="p-2">Route</th>
          <th className="p-2">Hits</th>
          <th className="p-2">Avg Time</th>
          <th className="p-2">Error %</th>
          <th className="p-2">Slow?</th>
        </tr>
      </thead>
      <tbody>
        {routes.map((r, i) => (
          <tr key={i} className="border-b">
            <td className="p-2">{r.route}</td>
            <td className="p-2">{r.requestCount || 0}</td>
            <td className="p-2">{r.avgResponseTime?.toFixed(1) || 0} ms</td>
            <td className="p-2">{r.errorPercent?.toFixed(1) || 0}%</td>
            <td className="p-2">{r.avgResponseTime > 500 ? "⚠ Slow" : "✓ Fast"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
