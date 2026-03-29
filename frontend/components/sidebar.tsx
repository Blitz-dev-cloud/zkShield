"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Sparkles, 
  Info,
  Send,
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
  { href: "/transfer", label: "Transfer", icon: Send },
  { href: "/about", label: "About", icon: Info },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      <aside className="sidebar-shell hidden md:flex fixed left-0 top-0 z-20 h-screen w-72 border-r border-sidebar-border flex-col">
        <div className="p-6 border-b border-sidebar-border/70">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              className="p-2.5 rounded-xl bg-primary/20 text-sidebar-primary border border-primary/30"
            >
              <Shield className="w-6 h-6" />
            </motion.div>
            <div>
              <h1 className="text-xl font-extrabold text-sidebar-foreground tracking-tight">
                zkShield<span className="text-sidebar-primary">++</span>
              </h1>
              <p className="text-xs tracking-[0.08em] text-sidebar-foreground/60">Zero-Knowledge Firewall</p>
            </div>
          </Link>
        </div>

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
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 border",
                      isActive
                        ? "bg-sidebar-primary/15 text-sidebar-primary border-sidebar-primary/45 shadow-[0_10px_18px_rgba(16,46,102,0.3)]"
                        : "border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold tracking-wide text-sm">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto h-2 w-2 rounded-full bg-sidebar-primary"
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border/70">
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <FileText className="w-5 h-5" />
            </a>
          </div>
          <p className="mt-4 text-xs tracking-wide text-sidebar-foreground/50">v1.0.0 cryptographic security</p>
        </div>
      </aside>

      <nav className="mobile-dock md:hidden fixed left-0 right-0 bottom-0 z-30 border-t border-sidebar-border px-2 pb-3 pt-2">
        <ul className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors",
                    isActive
                      ? "bg-sidebar-primary/20 text-sidebar-primary"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
