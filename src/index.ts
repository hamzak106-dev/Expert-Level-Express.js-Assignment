import express, { Request, Response } from 'express';
import cors from 'cors';
import { LRUCache } from './cache.js';
import { RateLimiter } from './rateLimiter.js';
import { AsyncQueue } from './queue.js';
import { Monitoring } from './monitoring.js';
import { rateLimitMiddleware, monitoringMiddleware } from './middleware.js';
import { User } from './types.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const cache = new LRUCache<User>(1000, 60000);
const rateLimiter = new RateLimiter(10, 10000, 5);
const monitoring = new Monitoring();

const mockUsers: Record<number, User> = {
  1: { id: 1, name: 'John Doe', email: 'john@example.com' },
  2: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  3: { id: 3, name: 'Alice Johnson', email: 'alice@example.com' },
};

const fetchUserFromDB = async (userId: number): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[userId];
      if (user) {
        resolve(user);
      } else {
        reject(new Error(`User with ID ${userId} not found`));
      }
    }, 200);
  });
};

const queue = new AsyncQueue(fetchUserFromDB);

app.use(monitoringMiddleware(monitoring));
app.use(rateLimitMiddleware(rateLimiter));

let nextUserId = 4;

app.get('/users/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt(req.params.id, 10);

  if (isNaN(userId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  const cacheKey = `user:${userId}`;
  const cachedUser = cache.get(cacheKey);

  if (cachedUser) {
    res.json(cachedUser);
    return;
  }

  try {
    const user = await queue.enqueue(userId);
    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, user);
    }
    res.json(user);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found')) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.post('/users', async (req: Request, res: Response): Promise<void> => {
  const { name, email } = req.body;

  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  const newUser: User = {
    id: nextUserId++,
    name,
    email,
  };

  mockUsers[newUser.id] = newUser;
  const cacheKey = `user:${newUser.id}`;
  cache.set(cacheKey, newUser);

  res.status(201).json(newUser);
});

app.delete('/cache', (req: Request, res: Response): void => {
  cache.clear();
  res.json({ message: 'Cache cleared successfully' });
});

app.get('/cache-status', (req: Request, res: Response): void => {
  const stats = cache.getStats();
  const avgResponseTime = monitoring.getAverageResponseTime();

  res.json({
    cacheSize: stats.size,
    cacheHits: stats.hits,
    cacheMisses: stats.misses,
    hitRate: stats.totalRequests > 0 ? stats.hits / stats.totalRequests : 0,
    averageResponseTime: avgResponseTime,
    queueSize: queue.getQueueSize(),
  });
});

app.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  cache.stopCleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  cache.stopCleanup();
  process.exit(0);
});

