export default function CompaniesPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="mb-6">
        <h1 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: 700 }}>Companies</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 4 }}>
          Manage and monitor all registered companies on the platform.
        </p>
      </div>
      <div
        className="rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', height: 300 }}
      >
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Companies table coming soon.</p>
      </div>
    </div>
  );
}
