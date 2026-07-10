'use client';
type Member = { user: { id: string; name: string }; role: string };
type RevealVote = { userId: string; name: string; value: string };

export function MemberList({ members, votedIds, revealed, votes }: {
  members: Member[]; votedIds: Set<string>; revealed: boolean; votes: RevealVote[];
}) {
  const valueFor = (id: string) => votes.find(v => v.userId === id)?.value ?? '?';
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {members.map(m => (
        <li key={m.user.id} style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 64, border: '1px solid #999', borderRadius: 6,
            display: 'grid', placeItems: 'center', fontSize: 18,
            background: revealed ? '#eef' : votedIds.has(m.user.id) ? '#cfc' : '#eee',
          }}>
            {revealed ? valueFor(m.user.id) : votedIds.has(m.user.id) ? '✓' : ''}
          </div>
          <small>{m.user.name}{m.role === 'HOST' ? ' 👑' : ''}</small>
        </li>
      ))}
    </ul>
  );
}
