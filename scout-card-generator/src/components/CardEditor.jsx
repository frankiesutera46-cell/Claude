import { useState, useCallback } from 'react';
import FieldCanvas from './FieldCanvas';
import RouteAssigner from './RouteAssigner';
import DrawingToolbar from './DrawingToolbar';
import BottomSheet from './BottomSheet';
import { FORMATIONS, mirrorFormation, getDefensiveFront } from '../data/formations';

const DEFENSIVE_FRONTS = [
  { key: 'none', name: 'No Defense' },
  { key: '4-3', name: '4-3' },
  { key: '3-4', name: '3-4' },
  { key: 'nickel', name: 'Nickel' },
  { key: 'dime', name: 'Dime' },
  { key: 'bear', name: 'Bear' },
  { key: '46', name: '46' },
];

export default function CardEditor({ card, onUpdate, onDelete, cardIndex }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedDefender, setSelectedDefender] = useState(null);

  // Drawing state
  const [drawMode, setDrawMode] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#cc0000');
  const [drawWidth, setDrawWidth] = useState(2.5);
  const [drawStyle, setDrawStyle] = useState('solid');

  const formation = card.mirrored
    ? mirrorFormation(FORMATIONS[card.formationKey])
    : FORMATIONS[card.formationKey];

  const handleAssign = (playerKey, routeKey) => {
    const newAssignments = { ...card.assignments };
    if (routeKey === null) {
      delete newAssignments[playerKey];
    } else {
      newAssignments[playerKey] = routeKey;
    }
    onUpdate({ ...card, assignments: newAssignments });
  };

  const handleFieldChange = (field, value) => {
    onUpdate({ ...card, [field]: value });
  };

  const handleNoteChange = (playerKey, note) => {
    const newNotes = { ...card.playerNotes };
    if (!note) {
      delete newNotes[playerKey];
    } else {
      newNotes[playerKey] = note;
    }
    onUpdate({ ...card, playerNotes: newNotes });
  };

  const handleDragPlayer = useCallback((key, x, y) => {
    const newPositions = { ...card.customPositions, [key]: { x, y } };
    onUpdate({ ...card, customPositions: newPositions });
  }, [card, onUpdate]);

  const handleDragDefender = useCallback((id, x, y) => {
    const newDefenders = card.defensivePlayers.map((d) =>
      d.id === id ? { ...d, x, y } : d
    );
    onUpdate({ ...card, defensivePlayers: newDefenders });
  }, [card, onUpdate]);

  const handleDefensiveFront = (frontKey) => {
    const defenders = getDefensiveFront(frontKey);
    onUpdate({ ...card, defensiveFrontKey: frontKey, defensivePlayers: defenders });
    setSelectedDefender(null);
  };

  const addDefender = () => {
    const id = `def-${Date.now()}`;
    const newDef = { id, x: 300, y: 200, label: '?' };
    onUpdate({ ...card, defensivePlayers: [...(card.defensivePlayers || []), newDef] });
  };

  const removeDefender = (id) => {
    onUpdate({
      ...card,
      defensivePlayers: (card.defensivePlayers || []).filter((d) => d.id !== id),
    });
    if (selectedDefender === id) setSelectedDefender(null);
  };

  const updateDefenderLabel = (id, label) => {
    const newDefenders = (card.defensivePlayers || []).map((d) =>
      d.id === id ? { ...d, label } : d
    );
    onUpdate({ ...card, defensivePlayers: newDefenders });
  };

  const handleSelectPlayer = useCallback((key) => {
    setSelectedPlayer(key);
    setSelectedDefender(null);
  }, []);

  const handleSelectDefender = useCallback((id) => {
    setSelectedDefender(id);
    setSelectedPlayer(null);
  }, []);

  const resetPositions = () => {
    onUpdate({ ...card, customPositions: {} });
  };

  // Drawing handlers
  const handleToggleDraw = () => {
    setDrawMode((prev) => !prev);
    setEraserMode(false);
  };

  const handleToggleEraser = () => {
    setEraserMode((prev) => !prev);
    if (!eraserMode) setDrawMode(true);
  };

  const handleAddLine = useCallback((line) => {
    const newLines = [...(card.lines || []), line];
    onUpdate({ ...card, lines: newLines });
  }, [card, onUpdate]);

  const handleRemoveLine = useCallback((idx) => {
    const newLines = [...(card.lines || [])];
    newLines.splice(idx, 1);
    onUpdate({ ...card, lines: newLines });
  }, [card, onUpdate]);

  const handleUndoLine = () => {
    if (!card.lines?.length) return;
    const newLines = card.lines.slice(0, -1);
    onUpdate({ ...card, lines: newLines });
  };

  const handleClearLines = () => {
    onUpdate({ ...card, lines: [] });
  };

  // Route panel content (shared between inline and bottom sheet)
  const routePanelContent = (
    <>
      {selectedPlayer && (
        <>
          <RouteAssigner
            selectedPlayer={selectedPlayer}
            currentAssignment={card.assignments[selectedPlayer]}
            onAssign={handleAssign}
            playerLabel={selectedPlayer ? formation.players[selectedPlayer]?.label : null}
          />
          <div className="mt-3 pt-3 border-t border-card-border">
            <label className="text-[10px] uppercase tracking-widest text-text-secondary">
              Note for {formation.players[selectedPlayer]?.label}
            </label>
            <input
              type="text"
              placeholder="e.g. #4 - burns corner"
              value={card.playerNotes?.[selectedPlayer] || ''}
              onChange={(e) => handleNoteChange(selectedPlayer, e.target.value)}
              className="mt-1 w-full bg-sidebar text-text-primary text-xs px-2 py-1.5 rounded border border-card-border"
            />
          </div>
        </>
      )}

      {selectedDefender && (
        <div>
          <h3 className="text-accent font-bold text-sm tracking-wide mb-3">Defender</h3>
          {(() => {
            const def = (card.defensivePlayers || []).find((d) => d.id === selectedDefender);
            if (!def) return null;
            return (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-text-secondary">Label / Position</label>
                  <input
                    type="text"
                    value={def.label}
                    onChange={(e) => updateDefenderLabel(def.id, e.target.value)}
                    className="mt-1 w-full bg-sidebar text-text-primary text-sm px-2 py-1.5 rounded border border-card-border"
                    maxLength={4}
                  />
                </div>
                <button
                  onClick={() => removeDefender(def.id)}
                  className="w-full text-xs bg-red-900/50 text-red-300 px-2 py-1.5 rounded hover:bg-red-900"
                >
                  Remove Defender
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {!selectedPlayer && !selectedDefender && (
        <div className="text-center py-8 text-text-secondary text-sm">
          Click a player on the field to assign a route or edit
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-card-border">
        <label className="text-[10px] uppercase tracking-widest text-text-secondary">Card Notes</label>
        <textarea
          placeholder="Tendency notes, frequency, etc."
          value={card.notes || ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          className="mt-1 w-full bg-sidebar text-text-primary text-xs px-2 py-1.5 rounded border border-card-border h-16 resize-none"
        />
      </div>
    </>
  );

  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      {/* Card Header */}
      <div className="px-4 py-2 bg-accent-2/40 border-b border-card-border space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-accent font-bold text-lg">#{cardIndex + 1}</span>
          <select
            value={card.hash}
            onChange={(e) => handleFieldChange('hash', e.target.value)}
            className="bg-sidebar text-text-primary text-xs md:text-sm px-1.5 py-1 min-h-[44px] md:min-h-0 rounded border border-card-border"
          >
            <option value="L">L Hash</option>
            <option value="M">Middle</option>
            <option value="R">R Hash</option>
          </select>
          <input
            type="text"
            placeholder="Play Name..."
            value={card.playName}
            onChange={(e) => handleFieldChange('playName', e.target.value)}
            className="bg-sidebar text-text-primary text-sm px-2 py-1 min-h-[44px] md:min-h-0 rounded border border-card-border flex-1 min-w-[100px]"
          />
          <input
            type="text"
            placeholder="D&D"
            value={card.downDistance || ''}
            onChange={(e) => handleFieldChange('downDistance', e.target.value)}
            className="bg-sidebar text-text-primary text-xs px-2 py-1 min-h-[44px] md:min-h-0 rounded border border-card-border w-16"
          />
          <button
            onClick={() => handleFieldChange('mirrored', !card.mirrored)}
            className={`text-[10px] min-h-[44px] md:min-h-0 px-1.5 py-1 rounded border ${
              card.mirrored
                ? 'bg-accent text-white border-accent'
                : 'bg-sidebar text-text-secondary border-card-border hover:border-accent'
            }`}
            title="Mirror formation"
          >
            ↔ Flip
          </button>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 text-sm px-1 min-h-[44px] md:min-h-0"
            title="Delete card"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={card.formationKey}
            onChange={(e) => {
              onUpdate({
                ...card,
                formationKey: e.target.value,
                assignments: {},
                customPositions: {},
              });
              setSelectedPlayer(null);
            }}
            className="bg-sidebar text-text-primary text-xs px-1.5 py-1 min-h-[44px] md:min-h-0 rounded border border-card-border"
          >
            {Object.entries(FORMATIONS).map(([key, f]) => (
              <option key={key} value={key}>{f.name}</option>
            ))}
          </select>
          <select
            value={card.defensiveFrontKey || 'none'}
            onChange={(e) => handleDefensiveFront(e.target.value)}
            className="bg-sidebar text-text-primary text-xs px-1.5 py-1 min-h-[44px] md:min-h-0 rounded border border-card-border"
          >
            {DEFENSIVE_FRONTS.map((f) => (
              <option key={f.key} value={f.key}>DEF: {f.name}</option>
            ))}
          </select>
          <button
            onClick={resetPositions}
            className="text-[10px] text-text-secondary hover:text-text-primary px-1.5 py-1 min-h-[44px] md:min-h-0 bg-sidebar rounded border border-card-border"
          >
            Reset Pos
          </button>
          <button
            onClick={addDefender}
            className="text-[10px] text-text-secondary hover:text-text-primary px-1.5 py-1 min-h-[44px] md:min-h-0 bg-sidebar rounded border border-card-border"
          >
            + Defender
          </button>
          <span className="text-[10px] text-text-secondary opacity-50 ml-auto hidden md:inline">Drag to move</span>
        </div>
      </div>

      {/* Drawing Toolbar */}
      <DrawingToolbar
        drawMode={drawMode}
        eraserMode={eraserMode}
        drawColor={drawColor}
        drawWidth={drawWidth}
        drawStyle={drawStyle}
        onToggleDraw={handleToggleDraw}
        onToggleEraser={handleToggleEraser}
        onSetColor={setDrawColor}
        onSetWidth={setDrawWidth}
        onSetStyle={setDrawStyle}
        onUndo={handleUndoLine}
        onClearAll={handleClearLines}
        lineCount={card.lines?.length || 0}
      />

      {/* Main content */}
      <div className="flex flex-col lg:flex-row">
        {/* Field */}
        <div className="flex-1 p-3" style={{ minHeight: 420 }}>
          <FieldCanvas
            players={formation.players}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={handleSelectPlayer}
            assignments={card.assignments}
            cardId={card.id}
            customPositions={card.customPositions}
            onDragPlayer={handleDragPlayer}
            defensivePlayers={card.defensivePlayers || []}
            selectedDefender={selectedDefender}
            onSelectDefender={handleSelectDefender}
            onDragDefender={handleDragDefender}
            drawMode={drawMode}
            eraserMode={eraserMode}
            drawColor={drawColor}
            drawWidth={drawWidth}
            drawStyle={drawStyle}
            lines={card.lines || []}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
          />
        </div>

        {/* Right panel — desktop only */}
        <div className="hidden lg:block w-56 border-l border-card-border p-3 bg-sidebar/50 overflow-y-auto" style={{ maxHeight: 500 }}>
          {routePanelContent}
        </div>
      </div>

      {/* Bottom sheet — mobile/tablet */}
      <BottomSheet
        open={!!(selectedPlayer || selectedDefender)}
        onClose={() => { setSelectedPlayer(null); setSelectedDefender(null); }}
        title={
          selectedPlayer
            ? `${formation.players[selectedPlayer]?.label || selectedPlayer} — Route`
            : selectedDefender
              ? 'Defender'
              : ''
        }
      >
        {routePanelContent}
      </BottomSheet>
    </div>
  );
}
