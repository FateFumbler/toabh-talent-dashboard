"use client"

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, UserCircle } from "lucide-react";
import { MANAGERS } from "@/types/talent";
import { toast } from "sonner";

// Distinct color pairs per manager (border + background tint)
const managerColors: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  Aryan:      { border: "border-violet-500/50",   bg: "bg-violet-500/15",   text: "text-violet-300", dot: "bg-violet-400" },
  "Saloni Kale":    { border: "border-pink-500/50",     bg: "bg-pink-500/15",     text: "text-pink-300",   dot: "bg-pink-400" },
  Jhalak:     { border: "border-amber-500/50",   bg: "bg-amber-500/15",   text: "text-amber-300",  dot: "bg-amber-400" },
  Prashant:   { border: "border-cyan-500/50",    bg: "bg-cyan-500/15",    text: "text-cyan-300",   dot: "bg-cyan-400" },
  Anvitha:    { border: "border-emerald-500/50", bg: "bg-emerald-500/15", text: "text-emerald-300",dot: "bg-emerald-400" },
  Khadija:    { border: "border-rose-500/50",    bg: "bg-rose-500/15",    text: "text-rose-300",   dot: "bg-rose-400" },
};

const defaultColors = { border: "border-border", bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" };

function getManagerColors(manager: string) {
  return managerColors[manager] || defaultColors;
}

interface ManagerDropdownProps {
  currentManager: string | null | undefined;
  rowIndex: number;
  onManagerChange: (row: number, manager: string) => void;
  disabled?: boolean;
}

export function ManagerDropdown({
  currentManager,
  rowIndex,
  onManagerChange,
  disabled,
}: ManagerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      const handleScroll = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        }
      };
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
      return () => {
        document.removeEventListener("keydown", handleEscape);
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleScroll);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [isOpen]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (manager: string) => {
    if (manager === currentManager) {
      setIsOpen(false);
      return;
    }
    onManagerChange(rowIndex, manager);
    toast.success(`Manager updated to ${manager}`);
    setIsOpen(false);
  };

  const colors = getManagerColors(currentManager || "");

  const dropdownContent = isOpen && dropdownPosition ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed bg-popover border border-border rounded-xl shadow-xl z-[9999] overflow-hidden"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${Math.max(8, Math.min(dropdownPosition.left, window.innerWidth - 240 - 8))}px`,
        width: "220px",
      }}
    >
      <div className="py-1">
        {/* Unassigned */}
        <button
          onClick={() => handleSelect("")}
          className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[44px] hover:bg-accent ${
            !currentManager ? "bg-accent/60 font-medium text-foreground" : "text-popover-foreground"
          }`}
        >
          <UserCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">Unassigned</span>
          {!currentManager && <span className="text-xs text-muted-foreground">Current</span>}
        </button>

        {MANAGERS.map((manager, idx) => {
          const mColors = getManagerColors(manager);
          const isSelected = manager === currentManager;
          return (
            <motion.button
              key={manager}
              onClick={() => handleSelect(manager)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.15 }}
              className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[44px] hover:bg-accent ${
                isSelected ? `${mColors.bg} font-medium` : "text-popover-foreground"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${mColors.dot}`} />
              <span className={`flex-1 text-left ${isSelected ? mColors.text : ""}`}>{manager}</span>
              {isSelected && <span className="text-xs text-muted-foreground">Current</span>}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  ) : null;

  return (
    <div className="relative dropdown-container" ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-3 py-2 sm:px-2 sm:py-1 rounded-full text-sm sm:text-xs font-medium transition-all whitespace-nowrap min-h-[44px] sm:min-h-[auto] border ${colors.border} ${colors.bg} ${colors.text} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        style={{ minWidth: "140px", justifyContent: "center" }}
      >
        {currentManager ? (
          <>
            <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
            <span>{currentManager}</span>
          </>
        ) : (
          <span className="text-muted-foreground"><span className="sm:hidden">Assign Manager</span><span className="hidden sm:inline">Manager</span></span>
        )}
        <ChevronDown
          className="h-4 w-4 sm:h-3 sm:w-3 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {dropdownContent}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
