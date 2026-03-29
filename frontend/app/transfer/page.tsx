"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity, CheckCircle2, Loader, Lock, RefreshCw, Send, XCircle } from "lucide-react"
import { DashboardCard } from "@/components/dashboard-card"
import { Button } from "@/components/ui/button"

type AuthResponse = {
  ok: boolean
  sessionId?: string
  sessionKey?: string
  secretKey?: string
  userNullifier?: string | null
  logs?: string
  error?: string
}

type WorkflowStatusResponse = {
  ok: boolean
  artifacts?: {
    authProof: boolean
    authPublic: boolean
    mlProof: boolean
    ready: boolean
  }
  gateway?: {
    url: string
    reachable: boolean
    statusCode: number | null
    error: string | null
  }
}

type SendResponse = {
  ok: boolean
  statusCode?: number
  result?: {
    status?: string
    message?: string
  }
  logs?: string
  error?: string
}

export default function TransferPage() {
  const [requestMode, setRequestMode] = useState<"text" | "http">("text")
  const [payload, setPayload] = useState("Hello from zkShield frontend")
  const [destination, setDestination] = useState("https://httpbin.org/post")
  const [httpMethod, setHttpMethod] = useState("GET")
  const [httpUrl, setHttpUrl] = useState("https://httpbin.org/get")
  const [httpHeaders, setHttpHeaders] = useState('{"Accept":"application/json"}')
  const [httpBody, setHttpBody] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [sessionKey, setSessionKey] = useState("")
  const [packetSequence, setPacketSequence] = useState(1)

  const [authResult, setAuthResult] = useState<AuthResponse | null>(null)
  const [sendResult, setSendResult] = useState<SendResponse | null>(null)
  const [status, setStatus] = useState<WorkflowStatusResponse | null>(null)

  const [authorizing, setAuthorizing] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)

  useEffect(() => {
    void loadStatus()
  }, [])

  const loadStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch("/api/workflow/status")
      const data = (await res.json()) as WorkflowStatusResponse
      setStatus(data)
    } finally {
      setLoadingStatus(false)
    }
  }

  const authorize = async () => {
    setAuthorizing(true)
    setAuthResult(null)
    setSendResult(null)
    try {
      const response = await fetch("/api/workflow/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: secretKey || undefined }),
      })
      const data = (await response.json()) as AuthResponse
      setAuthResult(data)
      if (data.ok && data.sessionId) {
        setSessionId(data.sessionId)
      }
      if (data.ok && data.sessionKey) {
        setSessionKey(data.sessionKey)
        setPacketSequence(1)
      }
      if (data.ok && data.secretKey) {
        setSecretKey(data.secretKey)
      }
      await loadStatus()
    } catch {
      setAuthResult({ ok: false, error: "Authorization failed" })
    } finally {
      setAuthorizing(false)
    }
  }

  const sendPacket = async () => {
    if (!sessionId.trim()) return

    setSending(true)
    setSendResult(null)
    try {
      let parsedHeaders: Record<string, string> = {}
      if (requestMode === "http" && httpHeaders.trim()) {
        try {
          const raw = JSON.parse(httpHeaders) as unknown
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            throw new Error("Headers must be a JSON object")
          }
          parsedHeaders = Object.fromEntries(
            Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          )
        } catch {
          setSendResult({ ok: false, error: "Invalid headers JSON. Use an object like {\"Authorization\":\"Bearer x\"}" })
          setSending(false)
          return
        }
      }

      const response = await fetch("/api/workflow/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestMode,
          payload: requestMode === "text" ? payload : undefined,
          destination,
          httpRequest:
            requestMode === "http"
              ? {
                  method: httpMethod,
                  url: httpUrl,
                  headers: parsedHeaders,
                  body: httpBody,
                }
              : undefined,
          sessionId,
          sessionKey,
          packetSequence,
          gatewayUrl: "http://127.0.0.1:5001/packet",
          regenerateMlProof: true,
        }),
      })
      const data = (await response.json()) as SendResponse
      setSendResult(data)
      if (data.ok) {
        setPacketSequence((seq) => seq + 1)
      }
    } catch {
      setSendResult({ ok: false, error: "Packet send failed" })
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-6 md:space-y-8">
      <div className="space-y-3">
        <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-accent">Live Transfer Console</span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Auth-First Packet Workflow</h1>
        <p className="text-muted-foreground mt-1">
          1) Authorize once with secret key, 2) send any number of packets (each packet runs zkML verification).
        </p>
      </div>

      <DashboardCard hoverable={false}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">System Status</h2>
            <p className="text-sm text-muted-foreground">GET /api/workflow/status</p>
          </div>
          <Button onClick={loadStatus} disabled={loadingStatus} className="gap-2" variant="outline">
            <RefreshCw className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-border p-3 bg-secondary/30">
            <div className="font-medium text-foreground mb-2">Artifacts</div>
            <div className="space-y-1 text-muted-foreground">
              <div>auth_proof.json: {status?.artifacts?.authProof ? "yes" : "no"}</div>
              <div>auth_public.json: {status?.artifacts?.authPublic ? "yes" : "no"}</div>
              <div>ml/ezkl/proof.json: {status?.artifacts?.mlProof ? "yes" : "no"}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 bg-secondary/30">
            <div className="font-medium text-foreground mb-2">Gateway</div>
            <div className="space-y-1 text-muted-foreground break-all">
              <div>url: {status?.gateway?.url ?? "—"}</div>
              <div>reachable: {status?.gateway?.reachable ? "yes" : "no"}</div>
              <div>http: {status?.gateway?.statusCode ?? "—"}</div>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard hoverable={false}>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Step 1 — Authorize User
        </h2>
        <p className="text-sm text-muted-foreground mt-1">POST /api/workflow/auth</p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Secret Key (optional)</label>
            <input
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Leave empty to auto-generate"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <Button onClick={authorize} disabled={authorizing} className="gap-2">
            {authorizing ? <Loader className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {authorizing ? "Authorizing..." : "Authorize Once"}
          </Button>

          {authResult && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                authResult.ok ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {authResult.ok ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                {authResult.ok ? "Authorized" : "Authorization failed"}
              </div>
              {authResult.ok && (
                <div className="mt-1 text-xs text-muted-foreground break-all">
                  sessionId={authResult.sessionId} · userNullifier={authResult.userNullifier}
                </div>
              )}
              {authResult.ok && authResult.sessionKey && (
                <div className="mt-1 text-xs text-muted-foreground break-all">
                  sessionKey={authResult.sessionKey.slice(0, 16)}... · nextSequence={packetSequence}
                </div>
              )}
              {!authResult.ok && <div className="mt-1 text-xs text-muted-foreground">{authResult.error}</div>}
            </div>
          )}
        </div>
      </DashboardCard>

      <DashboardCard hoverable={false}>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4" />
          Step 2 — Send Packets
        </h2>
        <p className="text-sm text-muted-foreground mt-1">POST /api/workflow/send (generates fresh ML proof per send)</p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Packet Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={requestMode === "text" ? "default" : "outline"} onClick={() => setRequestMode("text")}>
                Raw Payload
              </Button>
              <Button type="button" variant={requestMode === "http" ? "default" : "outline"} onClick={() => setRequestMode("http")}>
                API Request
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Session ID</label>
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Destination URL</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="https://api.example.com/ingest"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Session Key</label>
            <input
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              placeholder="From authorize step"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Packet Sequence</label>
            <input
              type="number"
              min={1}
              value={packetSequence}
              onChange={(e) => setPacketSequence(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {requestMode === "text" ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Payload</label>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="w-full min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Method</label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">URL</label>
                  <input
                    value={httpUrl}
                    onChange={(e) => setHttpUrl(e.target.value)}
                    placeholder="https://api.example.com/resource"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Headers (JSON)</label>
                <textarea
                  value={httpHeaders}
                  onChange={(e) => setHttpHeaders(e.target.value)}
                  className="w-full min-h-20 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Body</label>
                <textarea
                  value={httpBody}
                  onChange={(e) => setHttpBody(e.target.value)}
                  className="w-full min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <Button onClick={sendPacket} disabled={!sessionId.trim() || !sessionKey.trim() || !destination.trim() || sending} className="gap-2">
            {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending + zkML verifying..." : "Send Packet"}
          </Button>

          {sendResult && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                sendResult.ok ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {sendResult.ok ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                {sendResult.ok ? "Gateway PASS" : "Gateway DROP/ERROR"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground break-all">
                status={sendResult.statusCode ?? "—"} · {sendResult.result?.message ?? sendResult.error ?? "No message"}
              </div>
            </div>
          )}
        </div>
      </DashboardCard>

      <DashboardCard hoverable={false}>
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Activity className="w-4 h-4" />
          Flow
        </div>
        <ol className="mt-3 text-sm text-muted-foreground list-decimal list-inside space-y-1">
          <li>POST /api/workflow/auth</li>
          <li>Copy/use returned sessionId</li>
          <li>POST /api/workflow/send repeatedly</li>
        </ol>
      </DashboardCard>
    </motion.div>
  )
}
