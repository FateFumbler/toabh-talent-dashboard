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

const actionConfirmationMessages: Partial<Record<StatusValue, string>> = {
  "Meeting Required": "Do you want to send meeting link?",
  "KYC Required": "Send KYC link?",
  "Onboarded": "Confirm talent is onboarded?",
  "Rejected": "Reject this talent?",
};

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfirmationModal({ isOpen, title, onConfirm, onCancel, isLoading }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-zinc-900 border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-6">
          <p className="text-foreground text-center">{title}</p>
        </div>
        
        <div className="flex border-t border-border">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 border-l border-border"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [pendingStatus, setPendingStatus] = useState<StatusValue | null>(null);
  const [step, setStep] = useState<1 | 2 | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setPendingStatus(null);
        setStep(null);
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
        setPendingStatus(null);
        setStep(null);
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

    setPendingStatus(status);

    // Check if we need step 1 confirmation
    const needsActionConfirmation = actionConfirmationMessages[status];
    
    if (needsActionConfirmation) {
      setStep(1);
    } else {
      // Skip to step 2 for "New" status
      setStep(2);
    }
  };

  const handleActionConfirm = () => {
    if (!pendingStatus) return;
    setStep(2);
  };

  const handleActionCancel = () => {
    setPendingStatus(null);
    setStep(null);
  };

  const handleFinalConfirm = () => {
    if (!pendingStatus) return;
    onStatusChange(rowIndex, pendingStatus);
    setIsOpen(false);
    setPendingStatus(null);
    setStep(null);
  };

  const handleFinalCancel = () => {
    setPendingStatus(null);
    setStep(null);
  };

  const colors = statusColors[currentStatus] || statusColors["New"];

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled || isLoading}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${colors.bg} ${colors.text} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          )}
          <span>{currentStatus || "New"}</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {isOpen && step === null && (
          <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-zinc-900 border border-border rounded-lg shadow-lg overflow-hidden">
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
                    <span>{status}</span>
                    {isSelected && (
                      <span className="ml-auto text-xs text-muted-foreground">Current</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Action Confirmation */}
      <ConfirmationModal
        isOpen={step === 1}
        title={pendingStatus ? actionConfirmationMessages[pendingStatus] || "" : ""}
        onConfirm={handleActionConfirm}
        onCancel={handleActionCancel}
      />

      {/* Step 2: Final Confirmation */}
      <ConfirmationModal
        isOpen={step === 2}
        title={pendingStatus ? `Are you sure you want to change status to "${pendingStatus}"?` : ""}
        onConfirm={handleFinalConfirm}
        onCancel={handleFinalCancel}
        isLoading={isLoading}
      />
    </>
  );
}
