"use client"

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Color palette for managers
const MANAGER_COLORS = [
  { bg: "#F3E8FF", text: "#7C3AED", border: "#DDD6FE" }, // Purple
  { bg: "#DBEAFE", text: "#2563EB", border: "#BFDBFE" }, // Blue
  { bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" }, // Green
  { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" }, // Red
  { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" }, // Amber
  { bg: "#FCE7F3", text: "#DB2777", border: "#FBCFE8" }, // Pink
  { bg: "#CFFAFE", text: "#0891B2", border: "#A5F3FC" }, // Cyan
  { bg: "#E0E7FF", text: "#4F46E5", border: "#C7D2FE" }, // Indigo
  { bg: "#FFEDD5", text: "#EA580C", border: "#FED7AA" }, // Orange
];

// Consistent color generator based on name hash
function getManagerColor(name: string): { bg: string; text: string; border: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MANAGER_COLORS[Math.abs(hash) % MANAGER_COLORS.length];
}

interface ManagerDropdownProps {
  currentManager: string | null | undefined;
  managers: string[];
  rowIndex: number;
  onManagerChange: (row: number, manager: string) => void;
  disabled?: boolean;
}

// Estimated dropdown height for smart positioning (avoids layout thrash before render)
const MANAGER_DROPDOWN_HEIGHT = 320;

function getSmartPosition(rect: DOMRect, dropdownWidth: number) {
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const margin = 16;

  // Flip up if not enough space below, but only if there's more room above than below
  const flipUp = spaceBelow < MANAGER_DROPDOWN_HEIGHT + margin && spaceAbove > spaceBelow;

  const top = flipUp
    ? rect.top - MANAGER_DROPDOWN_HEIGHT - 8
    : rect.bottom + 4;

  const left = Math.max(margin, Math.min(rect.left, window.innerWidth - dropdownWidth - margin));

  return { top, left, flipUp };
}

export function ManagerDropdown({
  currentManager,
  managers,
  rowIndex,
  onManagerChange,
  disabled,
}: ManagerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number; flipUp?: boolean } | null>(null);
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
          const pos = getSmartPosition(rect, 280);
          setDropdownPosition({ top: pos.top, left: pos.left, width: rect.width, flipUp: pos.flipUp });
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
    const pos = getSmartPosition(rect, 280);
    setDropdownPosition({ top: pos.top, left: pos.left, width: rect.width, flipUp: pos.flipUp });
  }, [isOpen]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const pos = getSmartPosition(rect, 280);
        setDropdownPosition({ top: pos.top, left: pos.left, width: rect.width, flipUp: pos.flipUp });
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

  const selectedColor = getManagerColor(currentManager || "");

  const dropdownContent = isOpen && dropdownPosition ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: dropdownPosition.flipUp ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: dropdownPosition.flipUp ? 4 : -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed bg-popover border border-border rounded-xl shadow-xl z-[9999] overflow-hidden"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: "280px",
      }}
    >
      <div className="py-1">
        {/* Header */}
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Select Manager
        </div>

        {/* Unassigned */}
        <button
          onClick={() => handleSelect("")}
          className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[48px] hover:bg-accent ${
            !currentManager 
              ? "bg-accent/80 font-medium text-foreground" 
              : "text-popover-foreground"
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <UserCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="flex-1 text-left">Unassigned</span>
          {!currentManager && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Current
            </Badge>
          )}
        </button>

        <div className="h-px bg-border mx-3 my-1" />

        {/* Managers list */}
        {managers.map((manager, idx) => {
          const mColor = getManagerColor(manager);
          const isSelected = manager === currentManager;
          return (
            <motion.button
              key={manager}
              onClick={() => handleSelect(manager)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.15 }}
              className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[48px] hover:bg-accent ${
                isSelected ? "bg-accent/60" : "text-popover-foreground"
              }`}
            >
              {/* Colored avatar/badge */}
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-medium text-xs"
                style={{ 
                  backgroundColor: mColor.bg, 
                  color: mColor.text,
                  border: `1px solid ${mColor.border}`
                }}
              >
                {manager.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              
              <span className="flex-1 text-left font-medium">{manager}</span>
              
              {isSelected && (
                <div className="flex items-center gap-1">
                  <Badge 
                    className="text-[10px] px-1.5 py-0 font-normal"
                    style={{ 
                      backgroundColor: mColor.bg, 
                      color: mColor.text,
                      borderColor: mColor.border
                    }}
                  >
                    Selected
                  </Badge>
                </div>
              )}
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
        className={`inline-flex items-center gap-2 px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-sm font-medium transition-all whitespace-nowrap min-h-[44px] sm:min-h-[auto] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed`}
        style={{ 
          minWidth: "150px", 
          justifyContent: "center",
          backgroundColor: currentManager ? selectedColor.bg : "transparent",
          color: currentManager ? selectedColor.text : "var(--muted-foreground)",
          borderColor: currentManager ? selectedColor.border : "var(--border)",
        }}
      >
        {currentManager ? (
          <>
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center font-medium text-[10px]"
              style={{ 
                backgroundColor: selectedColor.text,
                color: "#fff"
              }}
            >
              {currentManager.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="hidden sm:inline">{currentManager}</span>
            <span className="sm:hidden">{currentManager.split(' ')[0]}</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            <span className="sm:hidden">Assign</span>
            <span className="hidden sm:inline">Assign Manager</span>
          </span>
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
