import type { EventBus } from './event-bus.js'

type EventHandler<Payload> = (payload: Payload) => void | Promise<void>

export class MemoryEventBus<EventMap extends object>
  implements EventBus<EventMap>
{
  private handlers = new Map<keyof EventMap, Set<EventHandler<any>>>()

  async emit<K extends keyof EventMap>(
    event: K,
    payload: EventMap[K]
  ): Promise<void> {
    const handlers = this.handlers.get(event)

    if (!handlers || handlers.size === 0) {
      return
    }

    for (const handler of Array.from(handlers)) {
      await handler(payload)
    }
  }

  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): () => void {
    const handlers = this.handlers.get(event) ?? new Set<EventHandler<any>>()

    handlers.add(handler)
    this.handlers.set(event, handlers)

    return () => {
      handlers.delete(handler)

      if (handlers.size === 0) {
        this.handlers.delete(event)
      }
    }
  }

  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): () => void {
    let dispose: (() => void) | undefined

    const wrappedHandler: EventHandler<EventMap[K]> = async (payload) => {
      dispose?.()
      await handler(payload)
    }

    dispose = this.on(event, wrappedHandler)

    return dispose
  }
}
