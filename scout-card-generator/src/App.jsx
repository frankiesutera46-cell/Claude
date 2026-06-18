import { useState, useCallback } from 'react';
import CardEditor from './components/CardEditor';
import { FORMATIONS } from './data/formations';
import { exportToPDF, exportToPPTX } from './utils/export';

let nextId = 1;

function createEmptyCard() {
  return {
    id: `card-${nextId++}`,
    formationKey: '2x2',
    playName: '',
    hash: 'M',
    downDistance: '',
    notes: '',
    mirrored: false,
    assignments: {},
    playerNotes: {},
    customPositions: {},
    defensivePlayers: [],
    defensiveFrontKey: 'none',
    lines: [],
  };
}

export default function App() {
  const [cards, setCards] = useState([createEmptyCard()]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [gameTitle, setGameTitle] = useState('Week 1 Scout Cards');
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const addCard = useCallback(() => {
    const newCard = createEmptyCard();
    setCards((prev) => [...prev, newCard]);
    setActiveCardIndex(cards.length);
    setSidebarOpen(false);
  }, [cards.length]);

  const duplicateCard = useCallback(() => {
    if (cards.length === 0) return;
    const source = cards[activeCardIndex];
    const dup = {
      ...source,
      id: `card-${nextId++}`,
      playName: source.playName + ' (copy)',
      assignments: { ...source.assignments },
      playerNotes: { ...source.playerNotes },
      lines: source.lines ? source.lines.map((l) => ({ ...l, pts: [...l.pts] })) : [],
    };
    const newCards = [...cards];
    newCards.splice(activeCardIndex + 1, 0, dup);
    setCards(newCards);
    setActiveCardIndex(activeCardIndex + 1);
  }, [cards, activeCardIndex]);

  const updateCard = useCallback(
    (updated) => {
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    },
    []
  );

  const deleteCard = useCallback(
    (id) => {
      setCards((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (next.length === 0) return [createEmptyCard()];
        return next;
      });
      setActiveCardIndex((prev) => Math.min(prev, cards.length - 2));
    },
    [cards.length]
  );

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportToPDF(cards, gameTitle);
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('PDF export failed. Check console for details.');
    }
    setExporting(false);
  };

  const handleExportPPTX = async () => {
    setExporting(true);
    try {
      await exportToPPTX(cards, gameTitle);
    } catch (e) {
      console.error('PPTX export failed:', e);
      alert('PPTX export failed. Check console for details.');
    }
    setExporting(false);
  };

  const saveToLocal = () => {
    const data = JSON.stringify({ gameTitle, cards });
    localStorage.setItem('scoutCards', data);
    alert('Saved!');
  };

  const loadFromLocal = () => {
    const raw = localStorage.getItem('scoutCards');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setGameTitle(data.gameTitle || 'Scout Cards');
        setCards(data.cards || [createEmptyCard()]);
        setActiveCardIndex(0);
      } catch (e) {
        alert('Failed to load saved data.');
      }
    }
  };

  const goToPrevCard = () => {
    setActiveCardIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextCard = () => {
    setActiveCardIndex((prev) => Math.min(cards.length - 1, prev + 1));
  };

  const activeCard = cards[activeCardIndex] || cards[0];

  return (
    <div className="min-h-screen bg-sidebar">
      {/* Top bar */}
      <header className="bg-card-bg border-b border-card-border px-3 md:px-6 py-3 flex items-center gap-2 md:gap-4">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center bg-sidebar rounded border border-card-border text-text-primary"
        >
          ☰
        </button>

        <div className="flex items-center gap-2">
          <span className="text-accent font-bold text-xl tracking-wider">⬬</span>
          <span className="text-text-primary font-bold tracking-widest text-sm uppercase hidden sm:inline">
            Scout Card Generator
          </span>
        </div>

        <input
          type="text"
          value={gameTitle}
          onChange={(e) => setGameTitle(e.target.value)}
          className="bg-sidebar text-text-primary px-3 py-1.5 min-h-[44px] md:min-h-0 rounded border border-card-border text-sm flex-1 max-w-md ml-2 md:ml-6"
          placeholder="Game / Week Title"
        />

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          {/* Mobile card nav */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={goToPrevCard}
              disabled={activeCardIndex === 0}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-sidebar rounded border border-card-border text-text-primary disabled:opacity-30"
            >
              ◀
            </button>
            <span className="text-text-secondary text-xs min-w-[40px] text-center">
              {activeCardIndex + 1}/{cards.length}
            </span>
            <button
              onClick={goToNextCard}
              disabled={activeCardIndex === cards.length - 1}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-sidebar rounded border border-card-border text-text-primary disabled:opacity-30"
            >
              ▶
            </button>
          </div>

          <span className="text-text-secondary text-xs mr-2 hidden md:inline">
            {cards.length} card{cards.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={saveToLocal}
            className="bg-accent-2 text-text-primary text-xs px-3 py-1.5 min-h-[44px] md:min-h-0 rounded hover:brightness-125 transition"
          >
            💾 <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={loadFromLocal}
            className="bg-accent-2 text-text-primary text-xs px-3 py-1.5 min-h-[44px] md:min-h-0 rounded hover:brightness-125 transition"
          >
            📂 <span className="hidden sm:inline">Load</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="bg-accent text-white text-xs font-bold px-3 py-1.5 min-h-[44px] md:min-h-0 rounded hover:brightness-110 transition disabled:opacity-50 hidden sm:block"
          >
            {exporting ? '...' : '📄 Export PDF'}
          </button>
          <button
            onClick={handleExportPPTX}
            disabled={exporting}
            className="bg-accent text-white text-xs font-bold px-3 py-1.5 min-h-[44px] md:min-h-0 rounded hover:brightness-110 transition disabled:opacity-50 hidden sm:block"
          >
            {exporting ? '...' : '📊 Export PPTX'}
          </button>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Card list sidebar */}
        <aside className={`
          ${sidebarOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'}
          md:relative md:flex md:z-auto
          w-56 bg-card-bg border-r border-card-border min-h-[calc(100vh-54px)] p-3 flex flex-col gap-2
        `}>
          <div className="flex gap-1 mb-2">
            <button
              onClick={addCard}
              className="flex-1 bg-accent/20 text-accent text-xs font-bold py-2 min-h-[44px] md:min-h-0 rounded hover:bg-accent/30 transition"
            >
              + New Card
            </button>
            <button
              onClick={duplicateCard}
              className="bg-accent-2/50 text-text-secondary text-xs px-2 py-2 min-h-[44px] md:min-h-0 rounded hover:bg-accent-2 transition"
              title="Duplicate current card"
            >
              ⧉
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {cards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => { setActiveCardIndex(idx); setSidebarOpen(false); }}
                className={`w-full text-left px-3 py-2 min-h-[44px] md:min-h-0 rounded text-xs transition ${
                  idx === activeCardIndex
                    ? 'bg-accent/20 text-accent border border-accent/40'
                    : 'text-text-secondary hover:bg-sidebar border border-transparent'
                }`}
              >
                <div className="font-bold">#{idx + 1}</div>
                <div className="truncate">{card.playName || 'Unnamed'}</div>
                <div className="text-[10px] opacity-60">
                  {FORMATIONS[card.formationKey]?.name} · {card.hash === 'L' ? 'L' : card.hash === 'R' ? 'R' : 'M'}
                  {card.downDistance ? ` · ${card.downDistance}` : ''}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main editor */}
        <main className="flex-1 p-2 md:p-4">
          {activeCard && (
            <CardEditor
              key={activeCard.id}
              card={activeCard}
              cardIndex={activeCardIndex}
              onUpdate={updateCard}
              onDelete={() => deleteCard(activeCard.id)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
