import path from "node:path"
import { NextResponse } from "next/server"
import { readJsonFile, resolveRepoRoot, runBashScript, tailLogs } from "@/lib/workflow"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AuthPublic = [string, string]

export async function GET() {
  return NextResponse.json({
    route: "/api/workflow/generate",
    methods: ["GET", "POST"],
    description: "Generate both auth proof and ML proof (utility endpoint)",
    postBody: null,
    returns: {
      ok: "boolean",
      authStatus: "generated | failed",
      mlStatus: "generated | failed",
      packetReady: "boolean",
      authPublic: {
        root: "string | null",
        nullifierHash: "string | null",
      },
      artifacts: {
        authProof: "string",
        authPublic: "string",
        mlProof: "string",
      },
      logs: "string",
    },
  })
}

export async function POST() {
  try {
    const repoRoot = resolveRepoRoot()
    const result = await runBashScript(repoRoot, "scripts/gen_proof.sh", ["all"])

    const authPublicPath = path.join(repoRoot, "proofs", "auth_public.json")
    const authPublic = await readJsonFile<AuthPublic>(authPublicPath)

    const payload = {
      ok: result.code === 0,
      authStatus: result.code === 0 ? "generated" : "failed",
      mlStatus: result.code === 0 ? "generated" : "failed",
      packetReady: result.code === 0,
      authPublic: {
        root: authPublic?.[0] ?? null,
        nullifierHash: authPublic?.[1] ?? null,
      },
      artifacts: {
        authProof: "proofs/auth_proof.json",
        authPublic: "proofs/auth_public.json",
        mlProof: "ml/ezkl/proof.json",
      },
      logs: tailLogs(result.output),
    }

    return NextResponse.json(payload, { status: payload.ok ? 200 : 500 })
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