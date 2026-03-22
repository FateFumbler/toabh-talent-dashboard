import { useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StatusValue } from "@/types/talent";
import { STATUS_VALUES } from "@/types/talent";

const statusColors: Record<StatusValue, { bg: string; text: string; dot: string }> = {
  "New": { bg: "bg-gray-100", text: "text-gray-800", dot: "bg-gray-500" },
  "Meeting Required": { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  "KYC Required": { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  "Onboarded": { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  "Rejected": { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
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
    // If selecting the same status, do nothing
    if (status === currentStatus) {
      setIsOpen(false);
      return;
    }

    // Validate Onboarded requires manager
    if (status === "Onboarded" && !hasManager) {
      toast.error("Please assign a Talent Manager first");
      setIsOpen(false);
      return;
    }

    // Instant status update - no confirmation popup
    onStatusChange(rowIndex, status);
    setIsOpen(false);
    toast.success(`Status updated to ${status}`);
  };

  const colors = statusColors[currentStatus] || statusColors["New"];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${colors.bg} ${colors.text} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
        style={{ minWidth: '140px', justifyContent: 'center' }}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        )}
        <span>{currentStatus || "New"}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-zinc-900 border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="py-1">
            {STATUS_VALUES.map((status) => {
              const statusColor = statusColors[status];
              const isSelected = status === currentStatus;
              
              return (
                <button
                  key={status}
                  onClick={() => handleSelect(status)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors ${
                    isSelected ? "bg-accent/30" : ""
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusColor.dot}`} />
                  <span className="flex-1 text-left">{status}</span>
                  {isSelected && (
                    <span className="text-xs text-muted-foreground">Current</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
