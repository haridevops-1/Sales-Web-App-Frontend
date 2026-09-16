"use client";

import { BellIcon, CreditCardIcon, ShieldIcon, UserIcon, CheckIcon, SparklesIcon, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/v-card-17-utils/card";
import { motion, AnimatePresence } from "framer-motion";

const defaultSections = [
  { icon: UserIcon, id: "profile", label: "Profile" },
  { icon: BellIcon, id: "notifications", label: "Notifications" },
  { icon: CreditCardIcon, id: "billing", label: "Billing" },
  { icon: ShieldIcon, id: "security", label: "Security" },
];

const defaultContent: Record<string, { description: string; title: string; meta?: string }> = {
  billing: {
    description: "Manage your subscription, invoices, and payment methods for the Spikra sales engine.",
    title: "Billing & Plans",
    meta: "Zoho Catalyst Serverless Plan (Active)"
  },
  notifications: {
    description: "Control how and when you receive proposal approval alerts and digest emails.",
    title: "Notification Preferences",
    meta: "Instant alerts on proposal approvals"
  },
  profile: {
    description: "Update your consultant display name, avatar, and contact information.",
    title: "Profile Settings",
    meta: "Hariharan R • Product Consultant"
  },
  security: {
    description: "Set a strong password, two-factor authentication, and Zoho SSO login keys.",
    title: "Security & SSO",
    meta: "Zoho Enterprise SSO Verified"
  },
};

export interface PatternProps {
  className?: string;
  theme?: "spikra" | "default";
  onClose?: () => void;
}

export function Pattern({ className = "", theme = "spikra", onClose }: PatternProps) {
  const [active, setActive] = useState("profile");
  const panel = defaultContent[active];

  const isSpikra = theme === "spikra";

  return (
    <Card className={`w-full max-w-md p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-2xl bg-white dark:bg-slate-950 transition-all duration-300 ${className}`}>
      {/* Optional Top Modal / Card Header when used as a panel */}
      {onClose && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Workspace Settings
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-md"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <CardContent className="flex gap-0 p-0">
        {/* Animated Vertical Mini-Sidebar Nav */}
        <nav className="flex w-40 shrink-0 flex-col gap-1 border-r border-slate-100 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-900/40">
          {defaultSections.map(({ icon: Icon, id, label }) => {
            const isSelected = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                type="button"
                className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-all select-none outline-none ${
                  isSelected
                    ? isSpikra
                      ? "text-white font-semibold shadow-sm"
                      : "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {/* Smooth spring sliding active pill with Spikra theme */}
                {isSelected && (
                  <motion.span
                    layoutId="vcard-active-pill"
                    className={`absolute inset-0 rounded-lg -z-10 ${
                      isSpikra
                        ? "bg-gradient-to-r from-[#FF6B00] to-[#E65A00] shadow-[0_2px_8px_rgba(255,107,0,0.3)]"
                        : "bg-primary"
                    }`}
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <Icon className={`size-3.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Panel Content Area with Smooth Crossfade */}
        <div className="flex flex-1 flex-col justify-between p-5 min-h-[190px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-50">
                  {panel?.title}
                </h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                {panel?.description}
              </p>

              {panel?.meta && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{panel.meta}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#FF6B00] hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded transition-colors"
              onClick={() => {}}
            >
              <span>Configure</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Pattern;
