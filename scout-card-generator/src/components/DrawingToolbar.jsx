import { DRAW_COLORS, DRAW_WIDTHS, DRAW_STYLES } from '../utils/drawing';

export default function DrawingToolbar({
  drawMode,
  eraserMode,
  drawColor,
  drawWidth,
  drawStyle,
  onToggleDraw,
  onToggleEraser,
  onSetColor,
  onSetWidth,
  onSetStyle,
  onUndo,
  onClearAll,
  lineCount,
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-accent-2/40 border-b border-card-border flex-wrap">
      {/* Pen toggle */}
      <button
        onClick={onToggleDraw}
        className={`min-w-[44px] min-h-[44px] px-2 py-1.5 rounded text-xs font-bold transition ${
          drawMode && !eraserMode
            ? 'bg-accent text-white ring-2 ring-accent/50'
            : 'bg-sidebar text-text-secondary border border-card-border hover:border-accent'
        }`}
        title="Pen tool"
      >
        ✏️ Pen
      </button>

      {/* Eraser toggle */}
      <button
        onClick={onToggleEraser}
        className={`min-w-[44px] min-h-[44px] px-2 py-1.5 rounded text-xs font-bold transition ${
          eraserMode
            ? 'bg-red-600 text-white ring-2 ring-red-400/50'
            : 'bg-sidebar text-text-secondary border border-card-border hover:border-accent'
        }`}
        title="Eraser — click a line to delete"
      >
        🧹
      </button>

      {drawMode && !eraserMode && (
        <>
          {/* Separator */}
          <div className="w-px h-6 bg-card-border mx-1" />

          {/* Colors */}
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onSetColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition ${
                drawColor === c ? 'border-white scale-110' : 'border-card-border hover:border-text-secondary'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}

          <div className="w-px h-6 bg-card-border mx-1" />

          {/* Widths */}
          {DRAW_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => onSetWidth(w)}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded border transition ${
                drawWidth === w
                  ? 'border-white bg-sidebar'
                  : 'border-card-border bg-sidebar hover:border-text-secondary'
              }`}
              title={`Width: ${w}`}
            >
              <span
                className="block rounded-full bg-text-primary"
                style={{ width: w * 4, height: w * 4 }}
              />
            </button>
          ))}

          <div className="w-px h-6 bg-card-border mx-1" />

          {/* Style */}
          <select
            value={drawStyle}
            onChange={(e) => onSetStyle(e.target.value)}
            className="bg-sidebar text-text-primary text-xs px-2 py-1.5 rounded border border-card-border min-h-[36px]"
          >
            {DRAW_STYLES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo / Clear */}
      <button
        onClick={onUndo}
        disabled={!lineCount}
        className="min-w-[44px] min-h-[44px] px-2 py-1.5 rounded text-xs bg-sidebar text-text-secondary border border-card-border hover:border-accent transition disabled:opacity-30"
        title="Undo last line"
      >
        ↩ Undo
      </button>
      <button
        onClick={onClearAll}
        disabled={!lineCount}
        className="min-w-[44px] min-h-[44px] px-2 py-1.5 rounded text-xs bg-sidebar text-red-400 border border-card-border hover:border-red-400 transition disabled:opacity-30"
        title="Clear all drawn lines"
      >
        Clear
      </button>
    </div>
  );
}
