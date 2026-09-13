import React from 'react';
import './SpikraDotBorderButton.css';

/**
 * SpikraDotBorderButton
 *
 * A high-precision, themed React button implementing the Neuform dot-border style:
 * - 4 animated glowing corner dots
 * - 4 animated border drawing lines with staggered delays
 * - Repeating 45-degree diagonal mesh grid backdrop fading in on hover
 * - Smooth micro-scale and letter-spacing transition
 * - Built-in Spikra design tokens (Orange, Navy, Blue)
 *
 * @param {Object} props
 * @param {React.ElementType} [props.as='button'] - Root component element or polymorphic tag
 * @param {'orange' | 'navy' | 'blue'} [props.theme='orange'] - Color theme palette
 * @param {string} [props.type='button'] - Button HTML type ('button', 'submit', 'reset')
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className=''] - Outer container class
 * @param {string} [props.btnClassName=''] - Inner button element class
 * @param {React.ReactNode} props.children - Button label and icons
 * @param {React.CSSProperties} [props.style] - Inline style for wrapper
 * @param {Function} [props.onClick] - Click handler
 */
export default function SpikraDotBorderButton({
  as: Component = 'button',
  theme = 'orange',
  type = 'button',
  disabled = false,
  className = '',
  btnClassName = '',
  children,
  style,
  onClick,
  ...rest
}) {
  const isButton = Component === 'button';

  return (
    <div
      className={`spikra-dot-btn-wrapper theme-${theme} ${disabled ? 'is-disabled' : ''} ${className}`}
      style={style}
    >
      {/* 4 Animated Drawing Lines */}
      <div className="spikra-line horizontal top" aria-hidden="true" />
      <div className="spikra-line vertical right" aria-hidden="true" />
      <div className="spikra-line horizontal bottom" aria-hidden="true" />
      <div className="spikra-line vertical left" aria-hidden="true" />

      {/* 4 Animated Glowing Corner Dots */}
      <div className="spikra-dot top left" aria-hidden="true" />
      <div className="spikra-dot top right" aria-hidden="true" />
      <div className="spikra-dot bottom right" aria-hidden="true" />
      <div className="spikra-dot bottom left" aria-hidden="true" />

      {/* Functional Interactive Element */}
      <Component
        type={isButton ? type : undefined}
        disabled={isButton ? disabled : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        className={`spikra-dot-inner-btn ${btnClassName}`}
        onClick={disabled ? undefined : onClick}
        {...rest}
      >
        {children}
      </Component>
    </div>
  );
}
