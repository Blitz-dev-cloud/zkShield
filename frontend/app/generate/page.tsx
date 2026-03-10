"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ShieldCheck, 
  Cpu, 
  Sparkles,
  CheckCircle2,
  Loader2,
  Package,
  Send
} from "lucide-react"
import { DashboardCard } from "@/components/dashboard-card"
import { Button } from "@/components/ui/button"

type GenerationStatus = "pending" | "generating" | "generated"

interface GenerationState {
  authStatus: GenerationStatus
  mlStatus: GenerationStatus
  packetReady: boolean
}

function generateMockProofId(): string {
  return "0x" + Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join("")
}

export default function GeneratePage() {
  const [state, setState] = useState<GenerationState>({
    authStatus: "pending",
    mlStatus: "pending",
    packetReady: false
  })
  const [isRunning, setIsRunning] = useState(false)
  const [proofIds, setProofIds] = useState<{auth: string, ml: string} | null>(null)

  const generateProofs = async () => {
    setIsRunning(true)
    setState({ authStatus: "pending", mlStatus: "pending", packetReady: false })
    setProofIds(null)

    // Step 1: Generate Auth Proof
    await new Promise(r => setTimeout(r, 300))
    setState(s => ({ ...s, authStatus: "generating" }))
    
    await new Promise(r => setTimeout(r, 1200))
    const authProofId = generateMockProofId()
    setState(s => ({ ...s, authStatus: "generated" }))

    // Step 2: Generate ML Proof
    await new Promise(r => setTimeout(r, 300))
    setState(s => ({ ...s, mlStatus: "generating" }))
    
    await new Promise(r => setTimeout(r, 1500))
    const mlProofId = generateMockProofId()
    setState(s => ({ ...s, mlStatus: "generated", packetReady: true }))

    setProofIds({ auth: authProofId, ml: mlProofId })
    setIsRunning(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Proof Generation</h1>
        <p className="text-muted-foreground">
          Simulate sender generating zero-knowledge proofs.
        </p>
      </div>

      {/* Generation Steps */}
      <div className="grid gap-4">
        <GenerationStep
          step={1}
          title="Generate Auth Proof"
          description="Creating Groth16 zk-SNARK for identity proof"
          status={state.authStatus}
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <GenerationStep
          step={2}
          title="Generate ML Proof"
          description="Creating EZKL proof for packet safety"
          status={state.mlStatus}
          icon={<Cpu className="w-5 h-5" />}
        />
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={generateProofs}
          disabled={isRunning}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Proofs
            </>
          )}
        </Button>
      </div>

      {/* Packet Ready */}
      <AnimatePresence>
        {state.packetReady && proofIds && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DashboardCard 
              hoverable={false}
              className="border-2 border-success/50 bg-success/5"
            >
              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="p-3 rounded-lg bg-success/20 text-success"
                >
                  <Package className="w-6 h-6" />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <h3 className="font-semibold text-success">Packet Prepared with Proofs</h3>
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">auth_proof_id:</span>
                      <span className="text-primary break-all">{proofIds.auth}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">ml_proof_id:</span>
                      <span className="text-primary break-all">{proofIds.ml}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-success/20 flex items-center justify-center gap-2 text-muted-foreground">
                <Send className="w-4 h-4" />
                <span className="text-sm">Ready to send to firewall for verification</span>
              </div>
            </DashboardCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Card */}
      <DashboardCard hoverable={false}>
        <h3 className="text-lg font-semibold mb-4 text-foreground">How It Works</h3>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">1. Auth Proof:</strong> The sender generates a 
            Groth16 zk-SNARK proving they are in the authorized Merkle tree without revealing 
            their identity.
          </p>
          <p>
            <strong className="text-foreground">2. ML Proof:</strong> Using EZKL, the sender 
            proves their packet passes a neural network safety check without revealing the 
            packet contents or model weights.
          </p>
          <p>
            <strong className="text-foreground">3. Packet:</strong> Both proofs are attached 
            to the packet and sent to the firewall for verification.
          </p>
        </div>
      </DashboardCard>
    </motion.div>
  )
}

function GenerationStep({
  step,
  title,
  description,
  status,
  icon
}: {
  step: number
  title: string
  description: string
  status: GenerationStatus
  icon: React.ReactNode
}) {
  return (
    <DashboardCard hoverable={false}>
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-muted-foreground font-bold">
          {step}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <StatusIndicator status={status} />
      </div>
    </DashboardCard>
  )
}

function StatusIndicator({ status }: { status: GenerationStatus }) {
  const configs = {
    pending: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      label: "Pending",
      icon: null
    },
    generating: {
      bg: "bg-primary/10",
      text: "text-primary",
      label: "Generating",
      icon: <Loader2 className="w-4 h-4 animate-spin" />
    },
    generated: {
      bg: "bg-success/10",
      text: "text-success",
      label: "Generated",
      icon: <CheckCircle2 className="w-4 h-4" />
    }
  }

  const config = configs[status]

  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.text}`}
    >
      {config.icon}
      <span className="text-sm font-medium">{config.label}</span>
    </motion.div>
  )
}
