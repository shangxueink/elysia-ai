
import type { EventBus } from '@elysia-ai/core'
import type { CoreEventMap } from '@elysia-ai/core'

export interface RuntimeContext {
  eventBus: EventBus<CoreEventMap>
}
