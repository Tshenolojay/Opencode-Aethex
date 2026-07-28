export * as SpecialistBootstrap from "./bootstrap"

import { Effect, Layer } from "effect"
import { make as makeSearchSpecialist } from "./search-specialist"
import { make as makeRepositorySpecialist } from "./repository-specialist"
import { make as makeDependencySpecialist } from "./dependency-specialist"
import { make as makeDocumentationSpecialist } from "./documentation-specialist"
import { make as makeArchitectureSpecialist } from "./architecture-specialist"
import { make as makeVerificationSpecialist } from "./verification-specialist"
import { make as makeContextSpecialist } from "./context-specialist"
import { make as makePlanningSpecialist } from "./planning-specialist"

/**
 * Registers executable specialist implementations into SpecialistRegistry.
 * Profiles alone are not enough — SpecialistExecutor looks up BaseSpecialistInterface
 * instances registered here.
 */
const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* makeSearchSpecialist()
    yield* makeRepositorySpecialist()
    yield* makeDependencySpecialist()
    yield* makeDocumentationSpecialist()
    yield* makeArchitectureSpecialist()
    yield* makeVerificationSpecialist()
    yield* makeContextSpecialist()
    yield* makePlanningSpecialist()
  }),
)

export { layer }
