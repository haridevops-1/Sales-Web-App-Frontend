"use client";

import ThinkingState from "@/components/ui/thinking";
import * as React from "react";

export default function ThinkingDemo() {
  return (
    <div className="flex w-full max-w-md flex-col items-center justify-center rounded-2xl bg-canvas p-6 shadow-sm border border-line">
      <div className="flex min-h-[160px] w-full items-center justify-center">
        <ThinkingState variant="Steps" />
      </div>
    </div>
  );
}
