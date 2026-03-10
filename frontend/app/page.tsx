"use client"

import { motion } from "framer-motion"
import { 
  Send, 
  ShieldCheck, 
  Server, 
  ArrowRight,
  Cpu,
  Lock,
  GitBranch,
  Binary
} from "lucide-react"
import { DashboardCard, StatCard } from "@/components/dashboard-card"

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
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Hero Section */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          zkShield<span className="text-primary">++</span>
        </h1>
        <h2 className="text-xl text-muted-foreground">
          Zero-Knowledge Network Firewall
        </h2>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          A privacy-preserving firewall where packets prove identity and safety 
          using zero-knowledge cryptography. No secrets revealed, full verification.
        </p>
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
