import React from "react";

// Column names for the talent table
export type ColumnName = 
  | "Full Name" 
  | "Instagram" 
  | "City" 
  | "Gender" 
  | "Age" 
  | "Height" 
  | "Status" 
  | "Talent Manager";

// Default column order
const DEFAULT_COLUMNS: ColumnName[] = [
  "Full Name",
  "Instagram",
  "City",
  "Gender",
  "Age",
  "Height",
  "Status",
  "Talent Manager",
];

const STORAGE_KEY = "talent-table-columns";

// Get initial columns from localStorage or defaults
export function getInitialColumns(): ColumnName[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_COLUMNS;
}

// Save column preferences to localStorage
export function saveColumnPreferences(columns: ColumnName[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch (e) {
    // ignore
  }
}

// Hidden component - gear icon removed
export function ColumnVisibility(): React.ReactElement | null {
  // This component is intentionally hidden - gear icon removed
  return null;
}
