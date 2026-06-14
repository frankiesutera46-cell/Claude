import { useRef, useCallback, useEffect } from 'react';

export default function BottomSheet({ open, onClose, children, title }) {
  const sheetRef = useRef(null);
  const dragStartY = useRef(null);

  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('[data-drag-handle]')) {
      dragStartY.current = e.clientY;
      e.target.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const dy = e.clientY - dragStartY.current;
    if (dy > 0) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    sheetRef.current.style.transform = '';
    if (dy > 80) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-card-bg border-t border-card-border rounded-t-2xl max-h-[70vh] overflow-y-auto transition-transform"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Drag handle */}
        <div
          data-drag-handle
          className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 rounded-full bg-text-secondary/40" />
        </div>
        {title && (
          <div className="px-4 pb-2 text-accent font-bold text-sm tracking-wide border-b border-card-border">
            {title}
          </div>
        )}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
