import { RateLimitInfo } from './types.js';

export class RateLimiter {
  private requests: Map<string, RateLimitInfo[]>;
  private maxRequestsPerMinute: number;
  private burstWindow: number;
  private burstCapacity: number;

  constructor(
    maxRequestsPerMinute: number = 10,
    burstWindow: number = 10000,
    burstCapacity: number = 5
  ) {
    this.requests = new Map();
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.burstWindow = burstWindow;
    this.burstCapacity = burstCapacity;
  }

  checkLimit(identifier: string): { allowed: boolean; resetTime: number } {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    const recentRequests = userRequests.filter(
      (req) => now - req.resetTime < 60000
    );

    const burstRequests = userRequests.filter(
      (req) => now - req.resetTime < this.burstWindow
    );

    if (recentRequests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = recentRequests[0];
      const resetTime = oldestRequest.resetTime + 60000;
      return { allowed: false, resetTime };
    }

    if (burstRequests.length >= this.burstCapacity) {
      const oldestBurstRequest = burstRequests[0];
      const resetTime = oldestBurstRequest.resetTime + this.burstWindow;
      return { allowed: false, resetTime };
    }

    const newRequest: RateLimitInfo = {
      count: 1,
      resetTime: now,
    };

    recentRequests.push(newRequest);
    this.requests.set(identifier, recentRequests);

    return { allowed: true, resetTime: now + 60000 };
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }
}

