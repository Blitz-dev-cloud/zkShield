"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Sparkles, 
  Info,
  Github,
  FileText,
  Shield
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/verify", label: "Verify", icon: ShieldCheck },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/about", label: "About", icon: Info },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ rotate: 10 }}
            className="p-2 rounded-lg bg-primary/10 text-primary"
          >
            <Shield className="w-6 h-6" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              zkShield<span className="text-primary">++</span>
            </h1>
            <p className="text-xs text-muted-foreground">Zero-Knowledge Firewall</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer Links */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href="#"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <FileText className="w-5 h-5" />
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          v1.0.0 — Cryptographic Security
        </p>
      </div>
    </aside>
  )
}
