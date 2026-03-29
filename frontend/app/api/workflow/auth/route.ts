import crypto from "node:crypto"
import path from "node:path"
import { NextResponse } from "next/server"
import { readJsonFile, resolveRepoRoot, runBashScript, tailLogs } from "@/lib/workflow"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AuthProof = Record<string, unknown>
type AuthPublic = string[]

type AuthBody = {
  secretKey?: string
  gatewayUrl?: string
}

function generateSecretKey(): string {
  const buf = crypto.randomBytes(16)
  return BigInt("0x" + buf.toString("hex")).toString()
}

export async function GET() {
  return NextResponse.json({
    route: "/api/workflow/auth",
    methods: ["GET", "POST"],
    description: "Generate auth proof from secret key and authorize user once at gateway",
    postBody: {
      secretKey: "string (optional, auto-generated if omitted)",
      gatewayUrl: "string (optional, default http://127.0.0.1:5001/auth)",
    },
    returns: {
      ok: "boolean",
      secretKey: "string",
      sessionId: "string",
      sessionKey: "string",
      userNullifier: "string | null",
      logs: "string",
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AuthBody
    const repoRoot = resolveRepoRoot()

    const secretKey = body.secretKey?.trim() || generateSecretKey()
    const gatewayUrl = body.gatewayUrl?.trim() || "http://127.0.0.1:5001/auth"

    const authResult = await runBashScript(repoRoot, "scripts/gen_proof.sh", ["auth-only", secretKey])
    if (authResult.code !== 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Auth proof generation failed",
          logs: tailLogs(authResult.output),
        },
        { status: 500 },
      )
    }

    const authProofPath = path.join(repoRoot, "proofs", "auth_proof.json")
    const authPublicPath = path.join(repoRoot, "proofs", "auth_public.json")

    const authProof = await readJsonFile<AuthProof>(authProofPath)
    const authPublic = await readJsonFile<AuthPublic>(authPublicPath)

    if (!authProof || !authPublic) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing generated auth artifacts",
        },
        { status: 500 },
      )
    }

    const gatewayRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_proof: authProof, auth_public: authPublic }),
    })

    const gatewayData = (await gatewayRes.json().catch(() => ({}))) as {
      session_id?: string
      session_key?: string
      message?: string
      user_nullifier?: string
    }

    if (!gatewayRes.ok || !gatewayData.session_id || !gatewayData.session_key) {
      return NextResponse.json(
        {
          ok: false,
          error: gatewayData.message ?? "Gateway auth failed",
          logs: tailLogs(authResult.output),
        },
        { status: gatewayRes.status || 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      secretKey,
      sessionId: gatewayData.session_id,
      sessionKey: gatewayData.session_key,
      userNullifier: gatewayData.user_nullifier ?? authPublic?.[1] ?? null,
      logs: tailLogs(authResult.output),
    })
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
