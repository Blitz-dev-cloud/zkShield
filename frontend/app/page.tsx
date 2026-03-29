"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Send, 
  ShieldCheck, 
  Server, 
  ArrowRight,
  Cpu,
  Lock,
  GitBranch,
  Binary,
  Route,
  Zap,
  ChevronRight
} from "lucide-react"
import { DashboardCard, StatCard } from "@/components/dashboard-card"
import { Button } from "@/components/ui/button"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function OverviewPage() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="max-w-6xl mx-auto space-y-8 md:space-y-10"
    >
      {/* Hero Section */}
      <motion.div variants={fadeInUp} className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary">
          Production Dashboard
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          zkShield<span className="text-primary">++</span> Control Center
        </h1>
        <h2 className="text-lg md:text-2xl text-muted-foreground">
          Zero-Knowledge Network Firewall
        </h2>
        <p className="text-muted-foreground max-w-3xl leading-relaxed text-base md:text-lg">
          A privacy-preserving firewall where packets prove identity and safety 
          using zero-knowledge cryptography. No secrets revealed, full verification.
        </p>
      </motion.div>

      {/* Quick Start: Integrated Workflow */}
      <motion.div variants={fadeInUp}>
        <DashboardCard className="border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Quick Start: Full Workflow</h3>
          </div>
          
          <p className="text-muted-foreground mb-6">
            Complete end-to-end packet transfer with authorization and safety verification.
          </p>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0 mt-1">
                1
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">Authorization (Groth16)</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Generate auth proof with secret key. One-time per session.
                </p>
                <Link href="/transfer">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Lock className="w-4 h-4" />
                    Go to Transfer Page
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0 mt-1">
                2
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">Packet Generation (EZKL)</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Send multiple packets with fresh ML proof for each. Prove packet safety.
                </p>
                <code className="text-xs bg-secondary/40 px-2 py-1 rounded text-foreground">
                  Send unlimited packets with one auth
                </code>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0 mt-1">
                3
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">Gateway Verification</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Gateway verifies auth + ML proof using pairing equations. Returns PASS/DROP.
                </p>
                <code className="text-xs bg-secondary/40 px-2 py-1 rounded text-foreground">
                  No replay attacks. Each packet must have fresh proof.
                </code>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-primary/10 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Start with Transfer page → click "Generate Auth" → Send packets
            </p>
            <Link href="/transfer">
              <Button className="gap-2">
                <Zap className="w-4 h-4" />
                Open Workflow
              </Button>
            </Link>
          </div>
        </DashboardCard>
      </motion.div>

      {/* Architecture Flow */}
      <motion.div variants={fadeInUp}>
        <DashboardCard className="overflow-hidden">
          <h3 className="text-lg font-semibold mb-6 text-foreground">Architecture Flow</h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
            <FlowStep 
              icon={<Send className="w-5 h-5" />} 
              label="Sender" 
              sublabel="Packet Origin"
            />
            <ArrowConnector />
            <FlowStep 
              icon={<Lock className="w-5 h-5" />} 
              label="Auth Proof" 
              sublabel="Groth16"
            />
            <ArrowConnector />
            <FlowStep 
              icon={<Cpu className="w-5 h-5" />} 
              label="ML Proof" 
              sublabel="EZKL"
            />
            <ArrowConnector />
            <FlowStep 
              icon={<Server className="w-5 h-5" />} 
              label="Firewall" 
              sublabel="Verification"
            />
            <ArrowConnector />
            <FlowStep 
              icon={<ShieldCheck className="w-5 h-5" />} 
              label="Decision" 
              sublabel="PASS / DROP"
              highlight
            />
          </div>
        </DashboardCard>
      </motion.div>

      {/* System Stats */}
      <motion.div variants={fadeInUp}>
        <h3 className="text-lg font-semibold mb-4 text-foreground">System Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Auth Circuit Constraints" 
            value="1,197" 
            icon={<Lock className="w-5 h-5" />}
          />
          <StatCard 
            label="ML Model Architecture" 
            value="5→16→8→1" 
            icon={<Cpu className="w-5 h-5" />}
          />
          <StatCard 
            label="Merkle Tree Depth" 
            value="3" 
            icon={<GitBranch className="w-5 h-5" />}
          />
          <StatCard 
            label="Proof System" 
            value="Groth16 + EZKL" 
            icon={<Binary className="w-5 h-5" />}
          />
        </div>
      </motion.div>

      {/* Info Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Authentication Proof</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Groth16 zk-SNARK proves sender is authorized without revealing identity. 
                Uses Merkle tree membership and Poseidon commitments.
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">ML Safety Proof</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                EZKL proves packet is safe according to a neural network model, 
                without revealing packet contents or model weights.
              </p>
            </div>
          </div>
        </DashboardCard>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <DashboardCard>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Route className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-2">API Routes (GET + POST)</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Frontend exposes explicit routes for generation, transfer, and verification.
              </p>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-primary">GET /api/workflow</div>
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-primary">GET /api/workflow/status</div>
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-primary">GET|POST /api/workflow/auth</div>
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-primary">GET|POST /api/workflow/generate</div>
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-primary">GET|POST /api/workflow/send</div>
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-primary">GET|POST /api/workflow/verify</div>
              </div>
            </div>
          </div>
        </DashboardCard>
      </motion.div>
    </motion.div>
  )
}

function FlowStep({ 
  icon, 
  label, 
  sublabel,
  highlight = false 
}: { 
  icon: React.ReactNode
  label: string
  sublabel: string
  highlight?: boolean 
}) {
  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
        highlight 
          ? 'bg-primary/10 border border-primary/30' 
          : 'bg-secondary/50 border border-border'
      }`}
    >
      <div className={`p-3 rounded-lg ${highlight ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <span className={`text-sm font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {label}
      </span>
      <span className="text-xs text-muted-foreground font-mono">{sublabel}</span>
    </motion.div>
  )
}

function ArrowConnector() {
  return (
    <div className="hidden md:flex items-center text-muted-foreground">
      <ArrowRight className="w-5 h-5" />
    </div>
  )
}
