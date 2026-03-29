import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_GATEWAY_AUTH_URL = process.env.ZKSHIELD_GATEWAY_AUTH_URL?.trim() || "http://127.0.0.1:5001/auth"
const DEFAULT_GATEWAY_PACKET_URL = process.env.ZKSHIELD_GATEWAY_PACKET_URL?.trim() || "http://127.0.0.1:5001/packet"

export async function GET() {
  return NextResponse.json({
    service: "zkShield++ workflow API",
    routes: [
      {
        path: "/api/workflow",
        methods: ["GET"],
        purpose: "List all frontend workflow endpoints",
      },
      {
        path: "/api/workflow/status",
        methods: ["GET"],
        purpose: "Health/status for proof artifacts and optional gateway reachability",
      },
      {
        path: "/api/workflow/generate",
        methods: ["GET", "POST"],
        purpose: "Generate auth + ML proofs",
      },
      {
        path: "/api/workflow/auth",
        methods: ["GET", "POST"],
        purpose: "Authorize user once (secret key -> auth proof -> gateway session)",
      },
      {
        path: "/api/workflow/verify",
        methods: ["GET", "POST"],
        purpose: "Verify auth + ML proofs",
      },
      {
        path: "/api/workflow/send",
        methods: ["GET", "POST"],
        purpose: "Transfer packet + proofs to gateway",
      },
    ],
    quickStart: {
      auth: {
        method: "POST",
        path: "/api/workflow/auth",
        body: {
          secretKey: "optional-auto-generated",
          gatewayUrl: DEFAULT_GATEWAY_AUTH_URL,
        },
      },
      send: {
        method: "POST",
        path: "/api/workflow/send",
        body: {
          sessionId: "from /api/workflow/auth",
          payload: "hello gateway",
          gatewayUrl: DEFAULT_GATEWAY_PACKET_URL,
        },
      },
      verify: {
        method: "POST",
        path: "/api/workflow/verify",
      },
    },
  })
}
