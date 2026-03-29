"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ShieldCheck, 
  Cpu, 
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle
} from "lucide-react"
import { DashboardCard } from "@/components/dashboard-card"
import { Button } from "@/components/ui/button"

type VerificationStatus = "pending" | "verifying" | "ok" | "failed"
type Verdict = "pass" | "drop" | null

interface VerificationState {
  authStatus: VerificationStatus
  mlStatus: VerificationStatus
  verdict: Verdict
}

type VerifyResponse = {
  ok: boolean
  authStatus: VerificationStatus
  mlStatus: VerificationStatus
  verdict: Verdict
  authPublic: {
    root: string | null
    nullifierHash: string | null
  }
  logs: string
  error?: string
}

export default function VerifyPage() {
  const [state, setState] = useState<VerificationState>({
    authStatus: "pending",
    mlStatus: "pending",
    verdict: null
  })
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runVerification = async () => {
    setIsRunning(true)
    setState({ authStatus: "pending", mlStatus: "pending", verdict: null })
    setError(null)
    setResult(null)
    setState({ authStatus: "verifying", mlStatus: "verifying", verdict: null })

    try {
      const response = await fetch("/api/workflow/verify", {
        method: "POST",
      })

      const data = (await response.json()) as VerifyResponse
      setResult(data)

      setState({
        authStatus: data.authStatus,
        mlStatus: data.mlStatus,
        verdict: data.verdict,
      })

      if (!data.ok) {
        setError(data.error ?? "Verification failed")
      }
    } catch {
      setState({ authStatus: "failed", mlStatus: "failed", verdict: "drop" })
      setError("Request failed while running verification")
    } finally {
      setIsRunning(false)
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
        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary">Verifier Stage</span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Firewall Verification</h1>
        <p className="text-muted-foreground">
          Simulate firewall verification of packet proofs.
        </p>
      </div>

      {/* Verification Steps */}
      <div className="grid gap-4">
        <VerificationStep
          step={1}
          title="Auth Proof (Groth16)"
          description="Verifying sender authorization using zk-SNARK"
          status={state.authStatus}
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <VerificationStep
          step={2}
          title="ML Proof (EZKL)"
          description="Verifying packet safety using neural network proof"
          status={state.mlStatus}
          icon={<Cpu className="w-5 h-5" />}
        />
      </div>

      {/* Run Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={runVerification}
          disabled={isRunning}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Verification
            </>
          )}
        </Button>
      </div>

      {/* Verdict */}
      <AnimatePresence>
        {state.verdict && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <VerdictCard verdict={state.verdict} />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <DashboardCard hoverable={false} className="border-2 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Verification failed</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </DashboardCard>
      )}

      {/* Public Inputs */}
      <DashboardCard hoverable={false}>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Public Inputs</h3>
        <div className="space-y-3 font-mono text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">merkle_root:</span>
            <span className="text-primary break-all">{result?.authPublic.root ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">nullifier_hash:</span>
            <span className="text-primary break-all">{result?.authPublic.nullifierHash ?? "—"}</span>
          </div>
        </div>
      </DashboardCard>

      {result?.logs && (
        <DashboardCard hoverable={false}>
          <h3 className="text-lg font-semibold mb-3 text-foreground">Verification Logs</h3>
          <pre className="text-xs text-muted-foreground bg-secondary/40 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {result.logs}
          </pre>
        </DashboardCard>
      )}
    </motion.div>
  )
}

function VerificationStep({
  step,
  title,
  description,
  status,
  icon
}: {
  step: number
  title: string
  description: string
  status: VerificationStatus
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

function StatusIndicator({ status }: { status: VerificationStatus }) {
  const configs = {
    pending: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      label: "Pending",
      icon: null
    },
    verifying: {
      bg: "bg-primary/10",
      text: "text-primary",
      label: "Verifying",
      icon: <Loader2 className="w-4 h-4 animate-spin" />
    },
    ok: {
      bg: "bg-success/10",
      text: "text-success",
      label: "OK",
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    failed: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      label: "FAILED",
      icon: <XCircle className="w-4 h-4" />
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

function VerdictCard({ verdict }: { verdict: "pass" | "drop" }) {
  const isPass = verdict === "pass"

  return (
    <DashboardCard 
      hoverable={false}
      className={`border-2 ${isPass ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}
    >
      <div className="flex flex-col items-center gap-4 py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`p-4 rounded-full ${isPass ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}
        >
          {isPass ? (
            <CheckCircle2 className="w-12 h-12" />
          ) : (
            <XCircle className="w-12 h-12" />
          )}
        </motion.div>
        <div className="text-center">
          <h2 className={`text-3xl font-bold ${isPass ? 'text-success' : 'text-destructive'}`}>
            {isPass ? 'PASS' : 'DROP'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {isPass ? 'Packet Forwarded' : 'Packet Rejected'}
          </p>
        </div>
      </div>
    </DashboardCard>
  )
}
