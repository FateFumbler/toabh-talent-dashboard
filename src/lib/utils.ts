import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHeight(height: string | number | undefined | null): string {
  if (!height) return "-";
  const trimmed = String(height).trim();
  if (!trimmed) return "-";
  
  const feetInchesMatch = trimmed.match(/(\d+'\d+"?)/);
  if (feetInchesMatch) {
    return feetInchesMatch[1].replace(/"/g, "");
  }
  
  if (trimmed.includes("'") || trimmed.includes("ft")) {
    return trimmed.replace(/"/g, "").replace(/ ft /g, "'").replace(/ in$/g, "\"").replace(/ inches$/g, "\"");
  }
  const inches = parseInt(trimmed, 10);
  if (!isNaN(inches)) {
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const remainingInches = inches % 12;
      return remainingInches > 0 ? `${feet}'${remainingInches}"` : `${feet}'`;
    }
    return `${inches}"`;
  }
  return trimmed;
}
