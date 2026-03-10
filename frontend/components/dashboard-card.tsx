"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface DashboardCardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function DashboardCard({ children, className, hoverable = true }: DashboardCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : undefined}
      className={cn(
        "bg-card rounded-xl border border-border p-6",
        hoverable && "card-glow cursor-default",
        className
      )}
    >
      {children}
    </motion.div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <DashboardCard>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </DashboardCard>
  )
}
