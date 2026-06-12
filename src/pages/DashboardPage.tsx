export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="mb-6">
        <h1 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 4 }}>
          Platform overview
        </p>
      </div>
      <div
        className="rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', height: 300 }}
      >
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
          Dashboard content coming in the next phase.
        </p>
      </div>
    </div>
  );
}
