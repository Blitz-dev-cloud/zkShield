import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { promises as fs } from "node:fs"
import path from "node:path"

export type CommandResult = {
  code: number
  output: string
}

export function resolveRepoRoot(): string {
  const cwd = process.cwd()

  const localScripts = path.join(cwd, "scripts", "gen_proof.sh")
  if (existsSync(localScripts)) {
    return cwd
  }

  const parent = path.resolve(cwd, "..")
  const parentScripts = path.join(parent, "scripts", "gen_proof.sh")
  if (existsSync(parentScripts)) {
    return parent
  }

  throw new Error("Could not locate repository root (missing scripts/gen_proof.sh)")
}

export async function runBashScript(
  repoRoot: string,
  relativeScriptPath: string,
  args: string[] = [],
): Promise<CommandResult> {
  const scriptPath = path.join(repoRoot, relativeScriptPath)

  return new Promise((resolve) => {
    const child = spawn("bash", [scriptPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    })

    let output = ""

    child.stdout.on("data", (chunk) => {
      output += chunk.toString()
    })

    child.stderr.on("data", (chunk) => {
      output += chunk.toString()
    })

    child.on("close", (code) => {
      resolve({ code: code ?? 1, output })
    })

    child.on("error", (err) => {
      resolve({ code: 1, output: `${output}\n${err.message}` })
    })
  })
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

export function tailLogs(logs: string, maxChars = 6000): string {
  if (logs.length <= maxChars) return logs
  return logs.slice(logs.length - maxChars)
}
