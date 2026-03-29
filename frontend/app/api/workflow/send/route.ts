import crypto from "node:crypto"
import path from "node:path"
import { NextResponse } from "next/server"
import { fetchWithRetries, readJsonFile, resolveRepoRoot, runBashScript, tailLogs } from "@/lib/workflow"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_GATEWAY_PACKET_URL = process.env.ZKSHIELD_GATEWAY_PACKET_URL?.trim() || "http://127.0.0.1:5001/packet"

type HttpRequestPacket = {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: string
}

type MlProof = Record<string, unknown>

type SendBody = {
  payload?: unknown
  destination?: string
  gatewayUrl?: string
  sessionId?: string
  sessionKey?: string
  packetSequence?: number
  regenerateMlProof?: boolean
  requestMode?: "text" | "http"
  httpRequest?: HttpRequestPacket
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`
}

export async function GET() {
  return NextResponse.json({
    route: "/api/workflow/send",
    methods: ["GET", "POST"],
    description: "Send packet using existing auth session + per-packet ML proof",
    postBody: {
      payload: "string | object (optional)",
      destination: "string (required, target service URL)",
      gatewayUrl: `string (optional, default ${DEFAULT_GATEWAY_PACKET_URL})`,
      sessionId: "string (required, from /api/workflow/auth)",
      sessionKey: "string (required, from /api/workflow/auth)",
      packetSequence: "number (required, must increase per packet)",
      regenerateMlProof: "boolean (optional, default true)",
      requestMode: "text | http (optional, default text)",
      httpRequest: {
        method: "GET | POST | PUT | PATCH | DELETE",
        url: "http(s) upstream URL",
        headers: "record<string,string> (optional)",
        body: "string (optional)",
      },
    },
    returns: {
      ok: "boolean",
      gatewayUrl: "string",
      statusCode: "number",
      result: "gateway JSON response",
      logs: "string",
    },
    note: "Requires valid auth session, signed packet envelope, ml/ezkl/proof.json, and explicit destination URL",
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SendBody

    const repoRoot = resolveRepoRoot()
    const mlProofPath = path.join(repoRoot, "ml", "ezkl", "proof.json")

    if (!body.sessionId?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing sessionId. Authorize first using /api/workflow/auth.",
        },
        { status: 400 },
      )
    }

    const destination = body.destination?.trim()
    if (!destination) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing destination. Provide target URL for packet forwarding.",
        },
        { status: 400 },
      )
    }

    if (!body.sessionKey?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing sessionKey. Re-authorize to get a session key.",
        },
        { status: 400 },
      )
    }

    if (!Number.isFinite(body.packetSequence) || Number(body.packetSequence) <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing or invalid packetSequence (must be a positive number).",
        },
        { status: 400 },
      )
    }

    const regenerateMlProof = body.regenerateMlProof !== false
    let mlGenLogs = ""

    if (regenerateMlProof) {
      const mlGenResult = await runBashScript(repoRoot, "scripts/gen_proof.sh", ["ml-only"])
      mlGenLogs = mlGenResult.output
      if (mlGenResult.code !== 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "ML proof generation failed",
            logs: tailLogs(mlGenResult.output),
          },
          { status: 500 },
        )
      }
    }

    const mlProof = await readJsonFile<MlProof>(mlProofPath)
    if (!mlProof) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing ml/ezkl/proof.json",
        },
        { status: 400 },
      )
    }

    const gatewayUrl = body.gatewayUrl?.trim() || DEFAULT_GATEWAY_PACKET_URL
    const requestMode = body.requestMode ?? "text"

    let payload: unknown = "Hello from zkShield frontend"
    if (requestMode === "http") {
      const method = body.httpRequest?.method?.trim().toUpperCase() || "GET"
      const url = body.httpRequest?.url?.trim() || destination

      if (!url) {
        return NextResponse.json(
          {
            ok: false,
            error: "Missing httpRequest.url for requestMode=http",
          },
          { status: 400 },
        )
      }

      payload = {
        type: "http_request",
        method,
        url,
        headers: body.httpRequest?.headers ?? {},
        body: body.httpRequest?.body ?? "",
      }
    } else if (typeof body.payload === "string") {
      payload = body.payload.trim() || "Hello from zkShield frontend"
    } else if (body.payload !== undefined) {
      payload = body.payload
    }

    const sessionId = body.sessionId.trim()
    const sessionKey = body.sessionKey.trim()
    const sequence = Math.floor(Number(body.packetSequence))
    const nonce = crypto.randomBytes(16).toString("hex")
    const timestamp = Math.floor(Date.now() / 1000)
    const payloadHash = crypto.createHash("sha256").update(canonicalize(payload)).digest("hex")
    const signatureInput = `${sessionId}|${sequence}|${nonce}|${timestamp}|${payloadHash}`
    const signature = crypto.createHmac("sha256", sessionKey).update(signatureInput).digest("hex")

    let gatewayResponse: Response
    try {
      gatewayResponse = await fetchWithRetries(
        gatewayUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payload,
            destination,
            session_id: sessionId,
            ml_proof: mlProof,
            packet_meta: {
              sequence,
              nonce,
              timestamp,
              signature,
            },
          }),
        },
        {
          retries: 4,
          timeoutMs: 25_000,
          retryDelayMs: 1_500,
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gateway request failed"
      return NextResponse.json(
        {
          ok: false,
          gatewayUrl,
          statusCode: 502,
          error: `Gateway unreachable: ${message}`,
          logs: tailLogs(`POST ${gatewayUrl}\nerror=${message}`),
        },
        { status: 502 },
      )
    }

    const responseText = await gatewayResponse.text()
    let gatewayJson: unknown = null
    try {
      gatewayJson = JSON.parse(responseText)
    } catch {
      gatewayJson = { raw: responseText }
    }

    const ok = gatewayResponse.ok

    return NextResponse.json(
      {
        ok,
        gatewayUrl,
        statusCode: gatewayResponse.status,
        result: gatewayJson,
        logs: tailLogs(
          `${mlGenLogs ? `${mlGenLogs}\n` : ""}POST ${gatewayUrl}\nstatus=${gatewayResponse.status}\nsession_id=${sessionId}\ndestination=${destination}\nrequest_mode=${requestMode}\nsequence=${sequence}\nnonce=${nonce}\npayload_hash=${payloadHash}\nresponse=${
            typeof gatewayJson === "string" ? gatewayJson : JSON.stringify(gatewayJson)
          }`,
        ),
      },
      { status: gatewayResponse.status },
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
