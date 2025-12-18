export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  totalRequests: number;
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export interface QueueItem {
  userId: number;
  resolve: (value: User) => void;
  reject: (error: Error) => void;
}

