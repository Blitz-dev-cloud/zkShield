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
  Send,
  AlertTriangle
} from "lucide-react"
import { DashboardCard } from "@/components/dashboard-card"
import { Button } from "@/components/ui/button"

type GenerationStatus = "pending" | "generating" | "generated" | "failed"

interface GenerationState {
  authStatus: GenerationStatus
  mlStatus: GenerationStatus
  packetReady: boolean
}

type GenerateResponse = {
  ok: boolean
  authStatus: GenerationStatus
  mlStatus: GenerationStatus
  packetReady: boolean
  authPublic: {
    root: string | null
    nullifierHash: string | null
  }
  artifacts: {
    authProof: string
    authPublic: string
    mlProof: string
  }
  logs: string
  error?: string
}

type SendResponse = {
  ok: boolean
  gatewayUrl?: string
  statusCode?: number
  result?: {
    status?: string
    message?: string
    payload?: string
    raw?: string
  }
  logs?: string
  error?: string
}

export default function GeneratePage() {
  const [state, setState] = useState<GenerationState>({
    authStatus: "pending",
    mlStatus: "pending",
    packetReady: false
  })
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState("Hello from zkShield frontend")
  const [gatewayUrl, setGatewayUrl] = useState("http://127.0.0.1:5001/packet")
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<SendResponse | null>(null)

  const generateProofs = async () => {
    setIsRunning(true)
    setState({ authStatus: "pending", mlStatus: "pending", packetReady: false })
    setResult(null)
    setError(null)
    setState({ authStatus: "generating", mlStatus: "generating", packetReady: false })

    try {
      const response = await fetch("/api/workflow/generate", {
        method: "POST",
      })

      const data = (await response.json()) as GenerateResponse
      setResult(data)

      if (data.ok) {
        setState({
          authStatus: "generated",
          mlStatus: "generated",
          packetReady: true,
        })
      } else {
        setState({
          authStatus: "failed",
          mlStatus: "failed",
          packetReady: false,
        })
        setError(data.error ?? "Proof generation failed")
      }
    } catch {
      setState({
        authStatus: "failed",
        mlStatus: "failed",
        packetReady: false,
      })
      setError("Request failed while generating proofs")
    } finally {
      setIsRunning(false)
    }
  }

  const sendPacket = async () => {
    setIsSending(true)
    setSendResult(null)

    try {
      const response = await fetch("/api/workflow/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, gatewayUrl }),
      })

      const data = (await response.json()) as SendResponse
      setSendResult(data)
    } catch {
      setSendResult({
        ok: false,
        error: "Failed to reach frontend send API",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-8 md:space-y-10"
    >
      {/* Header */}
      <div className="space-y-3">
        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary">Prover Lab</span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Proof Generation</h1>
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
        {state.packetReady && result && (
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
                      <span className="text-muted-foreground">auth_proof:</span>
                      <span className="text-primary break-all">{result.artifacts.authProof}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">ml_proof:</span>
                      <span className="text-primary break-all">{result.artifacts.mlProof}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">merkle_root:</span>
                      <span className="text-primary break-all">{result.authPublic.root ?? "—"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">nullifier_hash:</span>
                      <span className="text-primary break-all">{result.authPublic.nullifierHash ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-success/20 flex items-center justify-center gap-2 text-muted-foreground">
                <Send className="w-4 h-4" />
                <span className="text-sm">Ready to send to firewall for verification</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Gateway URL</label>
                  <input
                    value={gatewayUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="http://127.0.0.1:5001/packet"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Packet Payload</label>
                  <textarea
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    className="w-full min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Enter packet payload"
                  />
                </div>

                <Button
                  onClick={sendPacket}
                  disabled={isSending}
                  className="gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Packet to Gateway
                    </>
                  )}
                </Button>

                {sendResult && (
                  <div className={`rounded-lg border px-3 py-2 text-sm ${sendResult.ok ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
                    <div className="font-semibold">{sendResult.ok ? "Gateway accepted packet (PASS)" : "Gateway rejected packet (DROP)"}</div>
                    <div className="mt-1 text-xs break-all text-muted-foreground">
                      status={sendResult.statusCode ?? "—"} · {sendResult.result?.message ?? sendResult.error ?? "No message"}
                    </div>
                  </div>
                )}
              </div>
            </DashboardCard>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <DashboardCard hoverable={false} className="border-2 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Generation failed</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </DashboardCard>
      )}

      {result?.logs && (
        <DashboardCard hoverable={false}>
          <h3 className="text-lg font-semibold mb-3 text-foreground">Workflow Logs</h3>
          <pre className="text-xs text-muted-foreground bg-secondary/40 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {result.logs}
          </pre>
        </DashboardCard>
      )}

      {sendResult?.logs && (
        <DashboardCard hoverable={false}>
          <h3 className="text-lg font-semibold mb-3 text-foreground">Gateway Delivery Logs</h3>
          <pre className="text-xs text-muted-foreground bg-secondary/40 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {sendResult.logs}
          </pre>
        </DashboardCard>
      )}

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
    },
    failed: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      label: "Failed",
      icon: <AlertTriangle className="w-4 h-4" />
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
