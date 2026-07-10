'use client';
type Round = { id: string; taskTitle: string; finalEstimate: string | null; avg: number | null };

export function HistoryPanel({ rounds }: { rounds: Round[] }) {
  if (!rounds.length) return null;
  return (
    <details style={{ marginTop: 24 }}>
      <summary>Historial ({rounds.length})</summary>
      <table style={{ marginTop: 8, borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ textAlign: 'left' }}>Tarea</th><th>Promedio</th><th>Final</th></tr></thead>
        <tbody>
          {rounds.map(r => (
            <tr key={r.id}>
              <td>{r.taskTitle}</td>
              <td style={{ textAlign: 'center' }}>{r.avg ?? '—'}</td>
              <td style={{ textAlign: 'center' }}>{r.finalEstimate ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
