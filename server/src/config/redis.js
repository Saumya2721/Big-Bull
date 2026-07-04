import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD, // <-- Added authentication binding
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

redisClient.on('error', (err) => console.error(' Redis Cache Cluster Connection Failure:', err));
redisClient.on('connect', () => console.log(' Redis cloud memory tier cached successfully.'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error(' Failed to establish link to active Redis cloud instance:', err);
  }
})();

export default redisClient;