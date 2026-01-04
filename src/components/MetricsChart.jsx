import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function MetricsChart({ data }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="route" />
          <YAxis />
          <Tooltip />
          <Line dataKey="responseTime" strokeWidth={2} />
          <Line dataKey="errorPercent" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
