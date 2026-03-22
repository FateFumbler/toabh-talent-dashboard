import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StatusValue } from "@/types/talent";
import { STATUS_VALUES } from "@/types/talent";

// Status colors using standard Tailwind + semantic tokens
const statusStyles: Record<
  StatusValue,
  { btnClass: string; dotClass: string }
> = {
  New: {
    btnClass: "bg-muted text-muted-foreground border-muted",
    dotClass: "bg-muted-foreground",
  },
  "Meeting Required": {
    btnClass:
      "bg-orange-100/15 text-orange-400 border-orange-500/40 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-500/30",
    dotClass: "bg-orange-400 dark:bg-orange-300",
  },
  "KYC Required": {
    btnClass:
      "bg-blue-100/15 text-blue-400 border-blue-500/40 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500/30",
    dotClass: "bg-blue-400 dark:bg-blue-300",
  },
  Onboarded: {
    btnClass:
      "bg-green-100/15 text-green-400 border-green-500/40 dark:bg-green-900/20 dark:text-green-300 dark:border-green-500/30",
    dotClass: "bg-green-400 dark:bg-green-300",
  },
  Rejected: {
    btnClass:
      "bg-red-100/15 text-red-400 border-red-500/40 dark:bg-red-900/20 dark:text-red-300 dark:border-red-500/30",
    dotClass: "bg-red-400 dark:bg-red-300",
  },
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
  hasManager = true,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = () => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setDropdownPosition(null);
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
        setDropdownPosition(null);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleScroll = () => {
      updatePosition();
    };
    
    // Use capture phase to catch scroll events in parent containers
    window.addEventListener("scroll", handleScroll, true);
    // Also handle window resize
    window.addEventListener("resize", handleScroll);
    
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const handleSelect = (status: StatusValue) => {
    if (status === currentStatus) {
      setIsOpen(false);
      setDropdownPosition(null);
      return;
    }

    if (status === "Onboarded" && !hasManager) {
      toast.error("Please assign a Talent Manager first");
      setIsOpen(false);
      setDropdownPosition(null);
      return;
    }

    onStatusChange(rowIndex, status);
    setIsOpen(false);
    setDropdownPosition(null);
    toast.success(`Status updated to ${status}`);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isLoading) return;
    
    if (!isOpen) {
      // Calculate position first, then open immediately
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setDropdownPosition(null);
    }
  };

  const styles = statusStyles[currentStatus] || statusStyles["New"];

  const dropdownContent = isOpen && dropdownPosition ? (
    <div
      className="dropdown-animate fixed bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${Math.max(8, Math.min(dropdownPosition.left, window.innerWidth - dropdownPosition.width - 8))}px`,
        maxWidth: `${window.innerWidth - 16}px`,
        minWidth: `${dropdownPosition.width}px`,
      }}
    >
      <div className="py-1">
        {STATUS_VALUES.map((status) => {
          const s = statusStyles[status];
          const isSelected = status === currentStatus;

          return (
            <button
              key={status}
              onClick={() => handleSelect(status)}
              className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 text-sm transition-colors min-h-[44px] ${
                isSelected
                  ? "bg-accent/60 font-medium text-foreground"
                  : "text-popover-foreground hover:bg-accent"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dotClass}`} />
              <span className="flex-1 text-left">{status}</span>
              {isSelected && (
                <span className="text-xs text-muted-foreground shrink-0">
                  Current
                </span>
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
        ref={triggerRef}
        onClick={handleTriggerClick}
        disabled={disabled || isLoading}
        className={`inline-flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap min-h-[44px] sm:min-h-[auto] border ${styles.btnClass} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        style={{ minWidth: "140px", justifyContent: "center" }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
        ) : (
          <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dotClass}`} />
        )}
        <span>{currentStatus || "New"}</span>
        <ChevronDown
          className="h-4 w-4 sm:h-3 sm:w-3 transition-transform duration-200"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
