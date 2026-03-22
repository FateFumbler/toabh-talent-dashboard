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
  anchorRect?: DOMRect | null;
}

function ConfirmationModal({ isOpen, title, onConfirm, onCancel, isLoading, anchorRect }: ConfirmationModalProps) {
  if (!isOpen) return null;

  // Calculate position: place popup below the anchor button, aligned to left edge
  // Use fixed positioning relative to viewport with coordinates from anchor rect
  const popupStyle: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        top: anchorRect.bottom + 8, // 8px gap below button
        left: anchorRect.left,
        zIndex: 1000,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      };

  return (
    <>
      {/* Backdrop - click to dismiss */}
      <div 
        className="fixed inset-0 z-[999]"
        onClick={onCancel}
        style={{ background: 'transparent' }}
      />
      
      {/* Popup - positioned near the clicked button using fixed coordinates */}
      <div 
        className="fixed z-[1000] w-64 bg-zinc-900 border border-border rounded-xl shadow-2xl overflow-hidden"
        style={popupStyle}
      >
        <div className="p-4">
          <p className="text-foreground text-sm text-center">{title}</p>
        </div>
        
        <div className="flex border-t border-border">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 border-l border-border"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </>
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
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setPendingStatus(null);
        setStep(null);
        setAnchorRect(null);
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
        setAnchorRect(null);
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

    // Get button position for popup anchoring
    if (buttonRef.current) {
      setAnchorRect(buttonRef.current.getBoundingClientRect());
    }

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
    setAnchorRect(null);
  };

  const handleFinalConfirm = () => {
    if (!pendingStatus) return;
    onStatusChange(rowIndex, pendingStatus);
    setIsOpen(false);
    setPendingStatus(null);
    setStep(null);
    setAnchorRect(null);
  };

  const handleFinalCancel = () => {
    setPendingStatus(null);
    setStep(null);
    setAnchorRect(null);
  };

  const colors = statusColors[currentStatus] || statusColors["New"];

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
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

      {/* Step 1: Action Confirmation - anchored near the clicked button */}
      <ConfirmationModal
        isOpen={step === 1}
        title={pendingStatus ? actionConfirmationMessages[pendingStatus] || "" : ""}
        onConfirm={handleActionConfirm}
        onCancel={handleActionCancel}
        anchorRect={anchorRect}
      />

      {/* Step 2: Final Confirmation - anchored near the clicked button */}
      <ConfirmationModal
        isOpen={step === 2}
        title={pendingStatus ? `Are you sure you want to change status to "${pendingStatus}"?` : ""}
        onConfirm={handleFinalConfirm}
        onCancel={handleFinalCancel}
        isLoading={isLoading}
        anchorRect={anchorRect}
      />
    </>
  );
}
