import path from "node:path"
import { access } from "node:fs/promises"
import { NextResponse } from "next/server"
import { resolveRepoRoot } from "@/lib/workflow"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const repoRoot = resolveRepoRoot()

  const authProofPath = path.join(repoRoot, "proofs", "auth_proof.json")
  const authPublicPath = path.join(repoRoot, "proofs", "auth_public.json")
  const mlProofPath = path.join(repoRoot, "ml", "ezkl", "proof.json")

  const [hasAuthProof, hasAuthPublic, hasMlProof] = await Promise.all([
    exists(authProofPath),
    exists(authPublicPath),
    exists(mlProofPath),
  ])

  const url = new URL(request.url)
  const gatewayUrl =
    url.searchParams.get("gatewayUrl")?.trim() || "http://127.0.0.1:5001/health"

  let gatewayReachable = false
  let gatewayStatusCode: number | null = null
  let gatewayError: string | null = null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(gatewayUrl, {
      method: "GET",
      signal: controller.signal,
    })
    gatewayStatusCode = res.status
    gatewayReachable = true
  } catch (error) {
    gatewayError = error instanceof Error ? error.message : "Unknown gateway error"
  } finally {
    clearTimeout(timeout)
  }

  const artifactsReady = hasAuthProof && hasAuthPublic && hasMlProof

  return NextResponse.json({
    ok: true,
    routesBase: "/api/workflow",
    artifacts: {
      authProof: hasAuthProof,
      authPublic: hasAuthPublic,
      mlProof: hasMlProof,
      ready: artifactsReady,
    },
    gateway: {
      url: gatewayUrl,
      reachable: gatewayReachable,
      statusCode: gatewayStatusCode,
      error: gatewayError,
    },
  })
}
