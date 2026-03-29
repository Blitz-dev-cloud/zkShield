import path from "node:path"
import { NextResponse } from "next/server"
import { readJsonFile, resolveRepoRoot, runBashScript, tailLogs } from "@/lib/workflow"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AuthPublic = [string, string]

export async function GET() {
  return NextResponse.json({
    route: "/api/workflow/verify",
    methods: ["GET", "POST"],
    description: "Verify existing Groth16 + EZKL proofs using scripts/verify_proof.sh",
    postBody: null,
    returns: {
      ok: "boolean",
      authStatus: "ok | failed",
      mlStatus: "ok | failed",
      verdict: "pass | drop",
      authPublic: {
        root: "string | null",
        nullifierHash: "string | null",
      },
      logs: "string",
    },
  })
}

export async function POST() {
  try {
    const repoRoot = resolveRepoRoot()
    const result = await runBashScript(repoRoot, "scripts/verify_proof.sh")

    const authPublicPath = path.join(repoRoot, "proofs", "auth_public.json")
    const authPublic = await readJsonFile<AuthPublic>(authPublicPath)

    const logs = tailLogs(result.output)
    const authOk = logs.includes("snarkJS: OK")
    const mlOk = logs.includes("ML Proof: VERIFIED")
    const ok = result.code === 0 && authOk && mlOk

    return NextResponse.json(
      {
        ok,
        authStatus: authOk ? "ok" : "failed",
        mlStatus: mlOk ? "ok" : "failed",
        verdict: ok ? "pass" : "drop",
        authPublic: {
          root: authPublic?.[0] ?? null,
          nullifierHash: authPublic?.[1] ?? null,
        },
        logs,
      },
      { status: ok ? 200 : 500 },
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
