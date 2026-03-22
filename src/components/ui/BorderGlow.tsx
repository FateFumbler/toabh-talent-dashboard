"use client"

import React from "react"

interface BorderGlowProps {
  children: React.ReactNode
  color?: string
  intensity?: number
  className?: string
}

export function BorderGlow({ 
  children, 
  color = "#a855f7", 
  intensity = 2.4,
  className = "" 
}: BorderGlowProps) {
  return (
    <div 
      className={`relative rounded-xl ${className}`}
      style={{
        background: "linear-gradient(oklch(0.12 0.02 255 / 0.8), oklch(0.12 0.02 255 / 0.8)) padding-box, " +
                    `linear-gradient(oklch(0.12 0.02 255 / 0.8), oklch(0.12 0.02 255 / 0.8)) border-box`,
        border: `2px solid transparent`,
        boxShadow: `0 0 ${intensity * 6}px ${color}40, 0 0 ${intensity * 12}px ${color}20`,
      }}
    >
      {/* Animated border gradient */}
      <div 
        className="absolute inset-0 rounded-xl pointer-events-none animate-border-glow"
        style={{
          padding: "2px",
          background: `linear-gradient(oklch(0.12 0.02 255 / 0.9), oklch(0.12 0.02 255 / 0.9)) padding-box, 
                       linear-gradient(90deg, ${color}00, ${color}, ${color}00) border-box`,
          border: "2px solid transparent",
          mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
