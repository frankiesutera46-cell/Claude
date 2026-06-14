import FieldCanvas from './FieldCanvas';
import { FORMATIONS, mirrorFormation, ROUTE_TYPES } from '../data/formations';

export default function PrintCard({ card, cardIndex }) {
  const formation = card.mirrored
    ? mirrorFormation(FORMATIONS[card.formationKey])
    : FORMATIONS[card.formationKey];

  const hasNotes = card.playerNotes && Object.keys(card.playerNotes).length > 0;

  return (
    <div
      className="print-card"
      style={{
        width: '7in',
        height: '5in',
        border: '2px solid #222',
        borderRadius: 6,
        padding: '0.25in',
        backgroundColor: 'white',
        fontFamily: 'Courier New, monospace',
        display: 'flex',
        flexDirection: 'column',
        pageBreakAfter: 'always',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #222',
          paddingBottom: 6,
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold', fontSize: 18 }}>#{cardIndex + 1}</span>
          <span
            style={{
              backgroundColor: '#222',
              color: 'white',
              padding: '2px 10px',
              borderRadius: 3,
              fontSize: 13,
              fontWeight: 'bold',
            }}
          >
            {card.hash === 'L' ? 'LEFT' : card.hash === 'R' ? 'RIGHT' : 'MID'}
          </span>
          {card.downDistance && (
            <span style={{ fontSize: 13, fontWeight: 'bold' }}>{card.downDistance}</span>
          )}
        </div>
        <div style={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>
          {card.playName || 'UNNAMED'}
        </div>
        <div style={{ fontSize: 11, color: '#666' }}>
          {FORMATIONS[card.formationKey]?.name}
          {card.mirrored ? ' (Flipped)' : ''}
        </div>
      </div>

      {/* Field diagram */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <FieldCanvas
          players={formation.players}
          assignments={card.assignments}
          cardId={`print-${card.id}`}
        />
      </div>

      {/* Footer - notes */}
      <div
        style={{
          borderTop: '1px solid #ccc',
          paddingTop: 4,
          marginTop: 4,
          fontSize: 10,
          display: 'flex',
          gap: 16,
        }}
      >
        {hasNotes && (
          <div style={{ flex: 1 }}>
            {Object.entries(card.playerNotes).map(([key, note]) => (
              <span key={key} style={{ marginRight: 12 }}>
                <strong>{formation.players[key]?.label}:</strong> {note}
              </span>
            ))}
          </div>
        )}
        {card.notes && (
          <div style={{ flex: 1, fontStyle: 'italic', color: '#555' }}>
            {card.notes}
          </div>
        )}
      </div>
    </div>
  );
}
