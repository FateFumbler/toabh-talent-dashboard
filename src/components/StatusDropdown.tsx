import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StatusValue } from "@/types/talent";
import { STATUS_VALUES } from "@/types/talent";

// Theme-aware status colors using CSS vars / semantic tokens
const statusColors: Record<StatusValue, { bg: string; text: string; dot: string }> = {
  "New": { bg: "bg-muted text-muted-foreground", text: "", dot: "bg-muted-foreground" },
  "Meeting Required": { bg: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200", text: "", dot: "bg-orange-500" },
  "KYC Required": { bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200", text: "", dot: "bg-blue-500" },
  "Onboarded": { bg: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200", text: "", dot: "bg-green-500" },
  "Rejected": { bg: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200", text: "", dot: "bg-red-500" },
};

interface StatusDropdownProps {
  currentStatus: StatusValue;
  rowIndex: number;
  onStatusChange: (row: number, status: StatusValue) => void;
  disabled?: boolean;
  isLoading?: boolean;
  hasManager?: boolean;
}

export function StatusDropdown({ 
  currentStatus, 
  rowIndex, 
  onStatusChange, 
  disabled,
  isLoading,
  hasManager = true
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
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

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (status: StatusValue) => {
    if (status === currentStatus) {
      setIsOpen(false);
      return;
    }

    if (status === "Onboarded" && !hasManager) {
      toast.error("Please assign a Talent Manager first");
      setIsOpen(false);
      return;
    }

    onStatusChange(rowIndex, status);
    setIsOpen(false);
    toast.success(`Status updated to ${status}`);
  };

  const colors = statusColors[currentStatus] || statusColors["New"];

  const dropdownContent = isOpen ? (
    <div 
      className="absolute right-0 top-full mt-1 dropdown-animate w-full sm:w-56 max-w-full bg-popover border border-border rounded-xl shadow-xl"
      style={{ 
        zIndex: 9999,
      }}
    >
      <div className="py-1">
        {STATUS_VALUES.map((status) => {
          const statusColor = statusColors[status];
          const isSelected = status === currentStatus;
          
          return (
            <button
              key={status}
              onClick={() => handleSelect(status)}
              className={`w-full flex items-center gap-2 px-3 py-3 sm:py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors min-h-[44px] ${
                isSelected ? "bg-accent/60 font-medium" : ""
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor.dot}`} />
              <span className="flex-1 text-left">{status}</span>
              {isSelected && (
                <span className="text-xs text-muted-foreground">Current</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative dropdown-container" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled || isLoading}
        className={`inline-flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap min-h-[44px] sm:min-h-[auto] ${colors.bg} ${colors.text} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
        style={{ minWidth: '140px', justifyContent: 'center' }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
        ) : (
          <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
        )}
        <span>{currentStatus || "New"}</span>
        <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3 transition-transform" />
      </button>

      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}
