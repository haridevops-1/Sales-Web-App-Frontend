import React, { useState, useRef, useEffect } from 'react';
import { BorderBeam } from '@/components/ui/border-beam-search';
import { Search, X } from 'lucide-react';
import './SpikraExperienceSearch.css';

/**
 * SpikraExperienceSearch - Custom search bar with animated BorderBeam outline
 * and inline shortcut badge.
 *
 * @param {string} value - Current search query
 * @param {Function} onChange - Search text change handler
 * @param {Function} onClear - Search clear handler
 * @param {string} placeholder - Input placeholder text
 * @param {number} totalCount - Total experiences count
 * @param {number} filteredCount - Filtered count matching the query
 */
export default function SpikraExperienceSearch({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search business, proposal, or project...',
  ariaLabel = 'Search customer experiences by business or project',
  totalCount,
  filteredCount,
}) {
  const hasQuery = Boolean(value && value.trim());
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);

  // Global ⌘K / Ctrl+K keyboard shortcut to focus the search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isBeamActive = isFocused || isHovered;

  const searchBar = (
    <div
      className={`spikra-search-bar ${isFocused ? 'is-focused' : ''} ${isHovered ? 'is-hovered' : ''}`}
    >
      <div className="spikra-search-icon-box">
        <Search size={16} className="spikra-search-icon" />
      </div>

      <input
        ref={inputRef}
        type="text"
        className="spikra-search-input"
        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck="false"
      />

      {/* When query is present: show result count + clear button */}
      {hasQuery ? (
        <div className="spikra-search-suffix">
          {typeof filteredCount === 'number' && (
            <span className="spikra-search-count-tag" title={`${filteredCount} results found`}>
              {filteredCount} {filteredCount === 1 ? 'found' : 'found'}
            </span>
          )}
          <button
            type="button"
            className="spikra-search-clear-btn"
            onClick={() => {
              onChange?.('');
              onClear?.();
              inputRef.current?.focus();
            }}
            aria-label="Clear search input"
            title="Clear search"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Inline Shortcut Chip: glows on hover or idle */
        <div
          className={`spikra-search-kbd-chip ${isHovered ? 'chip-active' : ''}`}
          onClick={() => inputRef.current?.focus()}
          title="Press ⌘K or click to search"
        >
          <span className="kbd-glyph">⌘</span>
          <span className="kbd-letter">K</span>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="spikra-search-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Full-perimeter Traveling Border Beam Outline Animation */}
      <BorderBeam
        size="sm"
        colorVariant="sunset"
        theme="light"
        duration={isBeamActive ? 2.0 : 3.0}
        borderRadius={22}
        className={`spikra-search-beam ${isBeamActive ? 'beam-energized' : 'beam-idle'}`}
      >
        {searchBar}
      </BorderBeam>
    </div>
  );
}
