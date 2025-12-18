# User Data API - Backend

An Express.js API with advanced caching strategies, rate limiting, and asynchronous processing to handle high traffic efficiently.

## Architecture Choices and Trade-offs

### LRU Cache Implementation
Implemented a custom Least Recently Used (LRU) cache using a `Map` data structure. This provides:
- O(1) average time complexity for get/set operations
- Automatic eviction of least recently used items when capacity is reached
- TTL-based expiration with background cleanup
- Cache statistics tracking (hits, misses, size)

**Trade-off**: Using in-memory cache means data is lost on server restart. For production, consider Redis or Memcached for distributed caching.

### Rate Limiting Strategy
Implemented a dual-window rate limiter:
- **Per-minute limit**: 10 requests per minute
- **Burst protection**: Maximum 5 requests in a 10-second window

This prevents both sustained high traffic and sudden bursts. The implementation uses a sliding window approach with request timestamps.

**Trade-off**: Current implementation stores rate limit data in memory. For distributed systems, consider using Redis for shared rate limit state.

### Asynchronous Processing Queue
Implemented a custom queue system that:
- Handles concurrent requests for the same user ID efficiently
- If multiple requests arrive for the same user ID while one is being processed, subsequent requests wait and share the result
- Processes requests sequentially to avoid overwhelming the "database"
- Simulates database delay (200ms) to demonstrate async behavior

**Trade-off**: The queue processes items sequentially. For higher throughput, consider parallel processing with a worker pool, but this requires careful handling of concurrent database access.

### Monitoring
Basic monitoring tracks:
- Response times per endpoint
- Error rates
- Total request counts

**Trade-off**: Metrics are stored in memory with a limit. For production, consider integrating with Prometheus, DataDog, or similar monitoring solutions.

## Caching Strategy

1. **Cache Key**: `user:${userId}`
2. **TTL**: 60 seconds (configurable)
3. **Max Size**: 1000 entries (LRU eviction)
4. **Background Cleanup**: Runs every 10 seconds to remove expired entries
5. **Cache-Aside Pattern**: Application checks cache first, then fetches from "database" if miss

## Rate Limiting Implementation

- **Algorithm**: Sliding window with dual limits
- **Identification**: Uses client IP address
- **Response**: Returns 429 status with `Retry-After` header
- **Headers**: Includes `X-RateLimit-*` headers for client information

## Asynchronous Processing

The queue system ensures:
1. Only one database call per user ID, even with concurrent requests
2. Subsequent requests for the same user ID wait for the first to complete
3. All waiting requests receive the same cached result
4. Sequential processing prevents database overload

## API Endpoints

### GET /users/:id
Retrieve user data by ID. Returns cached data if available, otherwise fetches from database.

**Response**: `200 OK` with user object, or `404 Not Found` if user doesn't exist

### POST /users
Create a new user. Requires `name` and `email` in request body.

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Response**: `201 Created` with created user object

### DELETE /cache
Clear the entire cache.

**Response**: `200 OK` with success message

### GET /cache-status
Get cache statistics and performance metrics.

**Response**:
```json
{
  "cacheSize": 5,
  "cacheHits": 10,
  "cacheMisses": 3,
  "hitRate": 0.769,
  "averageResponseTime": 45.2,
  "queueSize": 0
}
```

### GET /health
Health check endpoint.

**Response**: `200 OK` with status and timestamp

## Running the Application

```bash
# Install dependencies
pnpm install

# Start development server (with hot reload)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The server will run on `http://localhost:3001` by default (configurable via `PORT` environment variable).

## Testing the API

### Using curl

```bash
# Get user by ID
curl http://localhost:3001/users/1

# Create a new user
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"name":"New User","email":"new@example.com"}'

# Get cache status
curl http://localhost:3001/cache-status

# Clear cache
curl -X DELETE http://localhost:3001/cache
```

### Using Postman

1. Import the endpoints listed above
2. Test rate limiting by making 11+ requests quickly
3. Observe cache behavior: first request takes ~200ms, subsequent requests are instant
4. Test concurrent requests: make multiple simultaneous requests for the same user ID

## Performance Observations

- **First Request**: ~200ms (database simulation delay)
- **Cached Request**: <1ms (cache hit)
- **Concurrent Requests**: All requests for the same user ID share one database call
- **Rate Limiting**: Blocks requests exceeding limits with appropriate error messages

## Project Structure

```
backend/
├── src/
│   ├── cache.ts          # LRU cache implementation
│   ├── rateLimiter.ts    # Rate limiting logic
│   ├── queue.ts          # Async processing queue
│   ├── monitoring.ts     # Performance monitoring
│   ├── middleware.ts     # Express middleware
│   ├── types.ts          # TypeScript types
│   └── index.ts          # Main application
├── package.json
└── tsconfig.json
```

