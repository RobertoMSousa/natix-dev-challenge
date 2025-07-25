// src/utils/redis.ts
import Redis from 'ioredis';
import { redisUri, redisPort } from '../config'

export const redis = new Redis({
    host: redisUri,
    port: parseInt(redisPort),
    // password: process.env.REDIS_PASSWORD, // if needed
});