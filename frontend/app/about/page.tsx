"use client"

import { motion } from "framer-motion"
import { 
  Lock, 
  Cpu, 
  Server,
  GitBranch,
  Binary,
  Eye,
  EyeOff,
  Shield
} from "lucide-react"
import { DashboardCard } from "@/components/dashboard-card"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
}

export default function AboutPage() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          About zkShield<span className="text-primary">++</span>
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          A cryptographic firewall system that verifies network packets using 
          zero-knowledge proofs. Complete privacy with full verification.
        </p>
      </motion.div>

      {/* Identity Layer */}
      <motion.div variants={fadeInUp}>
        <DashboardCard>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <Lock className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-4">Identity Layer</h2>
              <div className="space-y-4">
                <InfoItem
                  icon={<GitBranch className="w-4 h-4" />}
                  title="Merkle Tree Membership"
                  description="Authorized users are stored in a Merkle tree. Senders prove they are in the tree without revealing which leaf they are."
                />
                <InfoItem
                  icon={<Binary className="w-4 h-4" />}
                  title="Poseidon Commitment"
                  description="User identities are committed using the Poseidon hash function, optimized for zero-knowledge circuits."
                />
                <InfoItem
                  icon={<Shield className="w-4 h-4" />}
                  title="Nullifier"
                  description="Each proof includes a nullifier that prevents replay attacks. The same packet cannot be verified twice."
                />
              </div>
            </div>
          </div>
        </DashboardCard>
      </motion.div>

      {/* Safety Layer */}
      <motion.div variants={fadeInUp}>
        <DashboardCard>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-4">Safety Layer</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <h4 className="font-medium text-foreground mb-2">Neural Network Model</h4>
                  <div className="flex items-center gap-2 font-mono text-lg text-primary">
                    <span className="px-3 py-1 rounded bg-primary/10">5</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="px-3 py-1 rounded bg-primary/10">16</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="px-3 py-1 rounded bg-primary/10">8</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="px-3 py-1 rounded bg-primary/10">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    A neural network classifier determines if packets are safe. 
                    EZKL converts this model into a zero-knowledge circuit.
                  </p>
                </div>
                <InfoItem
                  icon={<Binary className="w-4 h-4" />}
                  title="EZKL Proving System"
                  description="EZKL transforms ML models into zk-circuits, allowing inference to be verified without revealing inputs or weights."
                />
              </div>
            </div>
          </div>
        </DashboardCard>
      </motion.div>

      {/* Stateless Firewall */}
      <motion.div variants={fadeInUp}>
        <DashboardCard>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <Server className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-4">Stateless Firewall</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                The firewall is completely stateless. It only verifies proofs and makes 
                pass/drop decisions. It never learns anything about the actual data.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PrivacyCard
                  icon={<EyeOff className="w-5 h-5" />}
                  title="Sender Identity"
                  description="Hidden"
                />
                <PrivacyCard
                  icon={<EyeOff className="w-5 h-5" />}
                  title="Packet Contents"
                  description="Hidden"
                />
                <PrivacyCard
                  icon={<EyeOff className="w-5 h-5" />}
                  title="Model Weights"
                  description="Hidden"
                />
              </div>
            </div>
          </div>
        </DashboardCard>
      </motion.div>

      {/* Technical Summary */}
      <motion.div variants={fadeInUp}>
        <DashboardCard hoverable={false}>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Technical Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TechItem label="Auth Proof" value="Groth16" />
            <TechItem label="ML Proof" value="EZKL" />
            <TechItem label="Hash Function" value="Poseidon" />
            <TechItem label="Commitment" value="Merkle Tree" />
          </div>
        </DashboardCard>
      </motion.div>
    </motion.div>
  )
}

function InfoItem({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded bg-muted text-muted-foreground mt-0.5">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}

function PrivacyCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg bg-secondary/50 border border-border text-center"
    >
      <div className="inline-flex p-2 rounded-lg bg-destructive/10 text-destructive mb-2">
        {icon}
      </div>
      <h4 className="font-medium text-foreground text-sm">{title}</h4>
      <p className="text-xs text-destructive mt-1 font-medium">{description}</p>
    </motion.div>
  )
}

function TechItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/50 border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-mono font-medium text-foreground">{value}</p>
    </div>
  )
}
