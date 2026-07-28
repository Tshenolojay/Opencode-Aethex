export interface PhaseEntry {
  readonly phase: string
  readonly durationMs: number
  readonly result: string
  readonly error: string | undefined
}
