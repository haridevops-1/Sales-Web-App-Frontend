import * as React from "react";

export interface SpinningBorderButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: "orange" | "dark" | "navy";
  showArrow?: boolean;
}

export const SpinningBorderButton = React.forwardRef<
  HTMLButtonElement,
  SpinningBorderButtonProps
>(function SpinningBorderButton(
  {
    children = "Upload Document",
    className = "",
    theme = "orange",
    showArrow = false,
    disabled,
    ...props
  },
  ref,
) {
  const isOrange = theme === "orange";
  const isDark = theme === "dark";

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={
        `group relative inline-flex items-center justify-center h-[38px] rounded-full p-[1.5px] overflow-hidden transition-all duration-300 select-none ${
          disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none shadow-none"
            : isOrange
            ? "hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(255,107,0,0.5),0_0_18px_rgba(255,140,40,0.3)] shadow-[0_2px_10px_rgba(255,107,0,0.3)] active:translate-y-0"
            : "hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] shadow-sm"
        }` + (className ? ` ${className}` : "")
      }
      {...props}
    >
      {/* 1. Permanent Base Border - Solid and intact at all times */}
      <span
        className={
          isOrange
            ? "absolute inset-0 rounded-full bg-gradient-to-r from-[#FF6B00] via-[#FFA843] to-[#FF5500] opacity-90 transition-opacity duration-300 group-hover:opacity-100"
            : isDark
            ? "absolute inset-0 rounded-full bg-zinc-800 transition-opacity duration-300"
            : "absolute inset-0 rounded-full bg-[#0B192C] transition-opacity duration-300"
        }
      />

      {/* 2. True Centered Spinning Border Beam - Perfectly circular 360-degree rotation with zero cutoff */}
      <span
        className={
          isOrange
            ? "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350%] aspect-square animate-[spikra-spin-beam_3s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(255,107,0,0)_0deg,rgba(255,107,0,0)_240deg,rgba(255,160,50,0.35)_280deg,#FFA843_320deg,#FFE8B8_345deg,#FFFFFF_355deg,rgba(255,107,0,0)_360deg)] opacity-95 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350%] aspect-square animate-[spikra-spin-beam_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#ffffff_100%)] opacity-70 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        }
      />

      {/* 3. Button Surface & Content with Generous Horizontal Padding */}
      <span
        className={
          `relative z-10 inline-flex items-center justify-center gap-2.5 uppercase text-[12px] font-bold tracking-wider w-full h-full rounded-full px-8 transition-all duration-300 whitespace-nowrap ${
            isOrange
              ? "text-white bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF5500] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.15)] group-hover:brightness-105"
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
            className="transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0"
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
