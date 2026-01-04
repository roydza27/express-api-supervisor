export default function SummaryCard({ title, value }) {
  return (
    <div className="bg-white shadow rounded-2xl p-4 border">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
