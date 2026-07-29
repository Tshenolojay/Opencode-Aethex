import type { ExecutionPackage } from "@opencode-ai/schema/execution-package"

type ExecutionPackageInfo = typeof ExecutionPackage.Info.Type

const executionPackages = new Map<string, ExecutionPackageInfo>()
let latestExecutionSessionID: string | undefined

export function getExecutionPackage(sessionID: string): ExecutionPackageInfo | undefined {
  return executionPackages.get(sessionID)
}

export function latestExecutionPackage(): ExecutionPackageInfo | undefined {
  if (latestExecutionSessionID) return executionPackages.get(latestExecutionSessionID)
  return undefined
}

export function setExecutionPackage(sessionID: string, info: ExecutionPackageInfo) {
  executionPackages.set(sessionID, info)
  latestExecutionSessionID = sessionID
}
