import { subscribe as watch, SubscribeCallback } from '@parcel/watcher';

export async function createWatcher(dir: string) {
  const listeners = new Set<SubscribeCallback>();

  const watcher = await watch(dir, async (err, events) => {
    return Promise.all(
      [...listeners.values()].map((fn) => {
        return Promise.resolve(fn(err, events));
      }),
    ).catch(() => {});
  });

  return {
    addListener: (fn: SubscribeCallback) => {
      listeners.add(fn);
    },

    removeListener: (fn: SubscribeCallback) => {
      listeners.add(fn);
    },

    close: () => watcher.unsubscribe(),
  };
}
