import * as React from "react";

export interface SpinningBorderButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: "orange" | "blue" | "dark" | "navy";
  showArrow?: boolean;
}

// The ring's resting color is a translucent white — deliberately NOT the same
// color as the button surface — so it reads as a distinct ring at all times,
// with a brighter "comet" continuously sweeping around it for the spin effect.
// (An earlier version used the button's own color for the ring's resting state,
// which made the rotation almost invisible except for an instant once per lap.)
const RING_GRADIENT: Record<string, string> = {
  orange:
    "conic-gradient(from 0deg, rgba(255,255,255,0.4) 0deg, rgba(255,255,255,0.4) 260deg, #FFD9A8 300deg, #FFFFFF 330deg, #FFD9A8 355deg, rgba(255,255,255,0.4) 360deg)",
  blue:
    "conic-gradient(from 0deg, rgba(255,255,255,0.4) 0deg, rgba(255,255,255,0.4) 260deg, #B8CCFF 300deg, #FFFFFF 330deg, #B8CCFF 355deg, rgba(255,255,255,0.4) 360deg)",
  dark: "conic-gradient(from 0deg, rgba(255,255,255,0.25) 0deg, rgba(255,255,255,0.25) 260deg, #d4d4d8 300deg, #FFFFFF 330deg, #d4d4d8 355deg, rgba(255,255,255,0.25) 360deg)",
  navy: "conic-gradient(from 0deg, rgba(255,255,255,0.25) 0deg, rgba(255,255,255,0.25) 260deg, #8fa8cc 300deg, #FFFFFF 330deg, #8fa8cc 355deg, rgba(255,255,255,0.25) 360deg)",
};

export const SpinningBorderButton = React.forwardRef<
  HTMLButtonElement,
  SpinningBorderButtonProps
>(function SpinningBorderButton(
  {
    children = "Upload Document",
    className = "",
    style,
    theme = "orange",
    showArrow = false,
    disabled,
    ...props
  },
  ref,
) {
  const isOrange = theme === "orange";
  const isBlue = theme === "blue";
  const isDark = theme === "dark";

  return (
    <button
      ref={ref}
      disabled={disabled}
      // padding is set inline (not via a p-[3px] Tailwind class) because that
      // arbitrary-value utility was silently not being generated in this project's
      // build — computed padding measured 0px despite the class being present,
      // which in turn meant the surface layer (sized 100%/100%) covered the ring
      // layer completely, at every instant, with zero space for it to ever show.
      // An inline style can't be dropped by a build-tool content scan.
      style={{ padding: 3, ...style }}
      className={
        `group relative inline-flex items-center justify-center h-[38px] rounded-full overflow-hidden transition-all duration-300 select-none ${
          disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none shadow-none"
            : isOrange
            ? "hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(255,133,51,0.5),0_0_18px_rgba(255,140,40,0.3)] shadow-[0_2px_10px_rgba(255,133,51,0.3)] active:translate-y-0"
            : isBlue
            ? "hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(0,82,255,0.5),0_0_18px_rgba(77,139,255,0.3)] shadow-[0_2px_10px_rgba(0,82,255,0.3)] active:translate-y-0"
            : "hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] shadow-sm"
        }` + (className ? ` ${className}` : "")
      }
      {...props}
    >
      {/* 1. Spinning gradient ring, filling the whole button. Only the 3px edge stays
             visible because the surface layer below is a normal (non-absolute) flow
             child sized w-full/h-full — inside a flex button with p-[3px], that
             resolves against the content-box, so it naturally covers everything
             except this ring. (No mask-composite trick needed — that rendered
             nothing in practice; plain layering is simpler and actually works.) */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full animate-[spin_2.2s_linear_infinite] pointer-events-none"
        style={{ background: RING_GRADIENT[theme] ?? RING_GRADIENT.orange }}
      />

      {/* 2. Button Surface & Content with Generous Horizontal Padding */}
      <span
        className={
          `relative z-10 inline-flex items-center justify-center gap-2.5 uppercase text-[12px] font-bold tracking-wider w-full h-full rounded-full px-8 transition-all duration-300 whitespace-nowrap ${
            isOrange
              ? "text-white bg-gradient-to-r from-[#FF8533] via-[#FF9645] to-[#FF8533] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.15)] group-hover:brightness-105"
              : isBlue
              ? "text-white bg-gradient-to-r from-[#0052FF] via-[#1E6BFF] to-[#003087] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.15)] group-hover:brightness-105"
              : isDark
              ? "text-zinc-300 group-hover:text-white bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
              : "text-white bg-gradient-to-b from-[#1E2E45] to-[#0B192C]"
          }`
        }
      >
        {children}
        {showArrow && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10 transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </span>
    </button>
  );
});

export default SpinningBorderButton;
