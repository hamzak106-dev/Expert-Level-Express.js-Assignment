export interface RequestMetrics {
  responseTime: number;
  timestamp: number;
  endpoint: string;
  statusCode: number;
}

export class Monitoring {
  private metrics: RequestMetrics[];
  private maxMetrics: number;

  constructor(maxMetrics: number = 1000) {
    this.metrics = [];
    this.maxMetrics = maxMetrics;
  }

  recordRequest(metrics: RequestMetrics): void {
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getAverageResponseTime(endpoint?: string): number {
    const relevantMetrics = endpoint
      ? this.metrics.filter((m) => m.endpoint === endpoint)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return 0;
    }

    const sum = relevantMetrics.reduce((acc, m) => acc + m.responseTime, 0);
    return sum / relevantMetrics.length;
  }

  getErrorRate(endpoint?: string): number {
    const relevantMetrics = endpoint
      ? this.metrics.filter((m) => m.endpoint === endpoint)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return 0;
    }

    const errors = relevantMetrics.filter((m) => m.statusCode >= 400).length;
    return errors / relevantMetrics.length;
  }

  getTotalRequests(endpoint?: string): number {
    if (endpoint) {
      return this.metrics.filter((m) => m.endpoint === endpoint).length;
    }
    return this.metrics.length;
  }

  getMetrics(): RequestMetrics[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }
}

