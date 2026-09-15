type Listener<T = any> = (data: T) => void;

class EventBus {
  private listeners: Map<string, Set<Listener>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            this.emit(`storage:${event.key}`, data);
            this.emit('change', { key: event.key, data });
          } catch {
            // Ignore non-JSON storage events
          }
        }
      });
    }
  }

  subscribe<T = any>(event: string, callback: Listener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<T = any>(event: string, data?: T): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
