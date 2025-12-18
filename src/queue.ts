import { QueueItem, User } from './types.js';

export class AsyncQueue {
  private queue: QueueItem[];
  private processing: boolean;
  private pendingRequests: Map<number, QueueItem[]>;
  private fetchUserFn: (userId: number) => Promise<User>;

  constructor(fetchUserFn: (userId: number) => Promise<User>) {
    this.queue = [];
    this.processing = false;
    this.pendingRequests = new Map();
    this.fetchUserFn = fetchUserFn;
  }

  async enqueue(userId: number): Promise<User> {
    return new Promise((resolve, reject) => {
      const item: QueueItem = {
        userId,
        resolve,
        reject,
      };

      if (this.pendingRequests.has(userId)) {
        this.pendingRequests.get(userId)!.push(item);
      } else {
        this.pendingRequests.set(userId, [item]);
        this.queue.push(item);
      }

      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      const { userId, resolve, reject } = item;

      try {
        const user = await this.fetchUserFn(userId);
        const pending = this.pendingRequests.get(userId) || [];
        pending.forEach((p) => p.resolve(user));
        this.pendingRequests.delete(userId);
      } catch (error) {
        const pending = this.pendingRequests.get(userId) || [];
        pending.forEach((p) => p.reject(error as Error));
        this.pendingRequests.delete(userId);
      }
    }

    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

