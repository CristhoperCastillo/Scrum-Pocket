'use client';
export function Card({ value, selected, onPick }: { value: string; selected: boolean; onPick: (v: string) => void }) {
  return (
    <button
      onClick={() => onPick(value)}
      style={{
        width: 56, height: 84, fontSize: 20, borderRadius: 8, cursor: 'pointer',
        border: selected ? '2px solid #2563eb' : '1px solid #ccc',
        background: selected ? '#dbeafe' : '#fff',
      }}>
      {value}
    </button>
  );
}
