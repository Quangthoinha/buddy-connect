// Custom dropdown — thay native <select> để match design system Mushy.
// API:
//   <Select
//     value={current}
//     onChange={(value) => ...}
//     placeholder="— Chọn —"
//     options={[{ value, label, icon? }, ...]}
//     disabled={false}
//   />
//
// Hỗ trợ: click ngoài đóng, Esc đóng, keyboard navigation (Up/Down/Enter).

import React, { useEffect, useRef, useState } from 'react';

const PANEL_MAX_H = 320;
const PANEL_GAP = 6;

export default function Select({ value, onChange, options, placeholder = '— Chọn —', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [direction, setDirection] = useState('down');  // 'down' | 'up'
  const [searchQuery, setSearchQuery] = useState('');
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  // Lọc options theo từ khóa tìm kiếm
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset từ khóa khi đóng/mở panel
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setHighlight(-1);
    } else {
      // Focus vào ô tìm kiếm khi mở panel
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [open]);

  // Click ngoài → đóng
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Tính direction (down/up) khi mở dropdown — dựa vào space available trong viewport
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    function recalc() {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
      const spaceAbove = rect.top - PANEL_GAP;
      // Flip up nếu space dưới chật và trên rộng hơn
      if (spaceBelow < PANEL_MAX_H && spaceAbove > spaceBelow) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);  // capture để bắt scroll bên trong container
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [open]);

  // Esc đóng + arrow/Enter navigate
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(filteredOptions.length - 1, h + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
      } else if (e.key === 'Enter' && highlight >= 0) {
        e.preventDefault();
        const opt = filteredOptions[highlight];
        if (opt) {
          onChange(opt.value);
          setOpen(false);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, highlight, filteredOptions, onChange]);

  function pick(v) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className="mushy-select" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`mushy-select-trigger ${open ? 'mushy-select-trigger--open' : ''}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`mushy-select-value ${!selected ? 'mushy-select-placeholder' : ''}`}>
          {selected ? (
            <>
              {selected.icon && <span className="mushy-select-icon">{selected.icon}</span>}
              {selected.label}
            </>
          ) : placeholder}
        </span>
        <span className={`mushy-select-chevron ${open ? 'mushy-select-chevron--open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className={`mushy-select-panel mushy-select-panel--${direction}`} style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {options.length > 8 && (
            <div 
              style={{ 
                padding: '8px 10px', 
                borderBottom: '1px solid var(--hairline)',
                background: 'var(--surface)',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }} 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={searchInputRef}
                type="text"
                className="mushy-input"
                placeholder="Gõ từ khóa để lọc nhanh..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlight(-1); // Reset highlight khi tìm kiếm
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--hairline)',
                  minHeight: '36px',
                  width: '100%'
                }}
              />
            </div>
          )}

          <ul 
            role="listbox" 
            style={{ 
              listStyle: 'none', 
              margin: 0, 
              padding: '6px', 
              overflowY: 'auto',
              flex: 1
            }}
          >
            {filteredOptions.length === 0 ? (
              <li className="mushy-select-empty">Không có kết quả</li>
            ) : filteredOptions.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`mushy-select-option ${opt.value === value ? 'mushy-select-option--selected' : ''} ${i === highlight ? 'mushy-select-option--highlight' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(opt.value)}
              >
                {opt.icon && <span className="mushy-select-icon">{opt.icon}</span>}
                <span className="mushy-select-label">{opt.label}</span>
                {opt.value === value && <span className="mushy-select-check">✓</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

