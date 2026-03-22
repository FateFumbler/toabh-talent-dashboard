import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const COLUMN_PREFERENCES_KEY = "toabh_table_columns";

export const ALL_COLUMNS = [
  "Full Name",
  "Instagram",
  "City",
  "Gender",
  "Age",
  "Height",
  "Status",
  "Talent Manager",
] as const;

export type ColumnName = typeof ALL_COLUMNS[number];

export function getInitialColumns(): ColumnName[] {
  if (typeof window === "undefined") return [...ALL_COLUMNS];
  
  const stored = localStorage.getItem(COLUMN_PREFERENCES_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate that all stored columns are valid
      const validColumns = parsed.filter((col: string) => 
        ALL_COLUMNS.includes(col as ColumnName)
      );
      if (validColumns.length > 0) {
        return validColumns;
      }
    } catch {
      // Invalid JSON, ignore
    }
  }
  return [...ALL_COLUMNS];
}

export function saveColumnPreferences(columns: ColumnName[]): void {
  localStorage.setItem(COLUMN_PREFERENCES_KEY, JSON.stringify(columns));
}

interface ColumnVisibilityProps {
  visibleColumns: ColumnName[];
  onColumnsChange: (columns: ColumnName[]) => void;
}

export function ColumnVisibility({ visibleColumns, onColumnsChange }: ColumnVisibilityProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

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

  const toggleColumn = (column: ColumnName) => {
    const newColumns = visibleColumns.includes(column)
      ? visibleColumns.filter((c) => c !== column)
      : [...visibleColumns, column];
    onColumnsChange(newColumns);
  };

  const selectAll = () => {
    onColumnsChange([...ALL_COLUMNS]);
  };

  const deselectAll = () => {
    onColumnsChange([]);
  };

  const dropdown = (
    <div
      ref={dropdownRef}
      className="fixed z-[99999] w-56 bg-zinc-900 border border-border rounded-lg shadow-xl"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <span className="text-sm font-medium text-foreground">Columns</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="p-2 max-h-80 overflow-y-auto">
        {ALL_COLUMNS.map((column) => (
          <label
            key={column}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={visibleColumns.includes(column)}
              onChange={() => toggleColumn(column)}
              className="rounded border-muted-foreground/30 text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">{column}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 p-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={selectAll}
          className="flex-1 text-xs h-7 hover:bg-accent/50"
        >
          Select All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={deselectAll}
          className="flex-1 text-xs h-7 hover:bg-accent/50"
        >
          Deselect All
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 hover:bg-accent/50"
        title="Column visibility"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {isOpen && typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
