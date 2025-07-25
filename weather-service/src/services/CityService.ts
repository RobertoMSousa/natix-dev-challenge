import { apiKey, apiUri } from '../config';
import { redis } from '../utils/redis';
import { CircuitBreaker } from '../utils/circuitBreaker';



import {
    CityResult
} from '../types/WeatherTypes';

/**
 * Service responsible for fetching weather data and city search results,
 * utilizing caching with Redis and a circuit breaker pattern to improve
 * reliability and reduce external API calls.
 */
export class CityService {
    // Cache TTL: 1 day (86400 seconds)

    private cacheCityTTL = 604800; // 1 week
    private breaker = new CircuitBreaker(5, 30000, 5000); // (maxFailures, openTimeout, callTimeout)


    /**
     * Generates a unique Redis cache key for city search results based on city.
     * @param city - The city name
     * @returns The cache key string
     */
    private getCityCacheKey(city: string) {
        return `city:${city.toLowerCase()}`;
    }

    /**
     * Retrieves cached city search results from Redis for a given city query.
     * @param city - The city search query
     * @returns The cached city results or null if not found
     */
    async getCityFromCache(city: string) {
        const cacheKey = this.getCityCacheKey(city);
        const cached = await redis.get(cacheKey);
        // Parse cached JSON if exists, else return null
        return cached ? JSON.parse(cached) : null;
    }



    /**
     * Saves city search results to Redis cache with expiry.
     * @param city - The city search query
     * @param data - The city results to cache
     * @returns Promise that resolves when cache is set
     */
    async setCityCache(city: string, data: CityResult[]) {
        const cacheKey = this.getCityCacheKey(city);
        // Store serialized city results with expiration time (TTL)
        await redis.set(cacheKey, JSON.stringify(data), 'EX', this.cacheCityTTL);
    }



    /**
     * Fetches city search results from the external weather API for autocomplete.
     * Caches the results before returning.
     * @param city - The city search query
     * @returns Array of CityResult objects
     * @throws Error if the API request fails or returns a non-OK status
     */
    async getCityListExternalAPI(city: string): Promise<CityResult[]> {
        const endpoint = `${apiUri}/search.json?key=${apiKey}&q="${encodeURIComponent(city)}"`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                // Throw error if API response status is not successful
                throw new Error(`Weather API request failed with status ${response.status}: ${response.statusText}`);
            }
            const data = await response.json() as CityResult[];

            // Cache city search results for future autocomplete requests
            await this.setCityCache(city, data);
            return data;
        } catch (error: any) {
            // Propagate error with descriptive message
            throw new Error(`Failed to fetch weather data: ${error.message || error}`);
        }
    }


    async getCity(city: string): Promise<CityResult[]> {
        // Attempt to retrieve cached city autocomplete results
        try {
            let cachedCities: CityResult[] = await this.getCityFromCache(city);
            if (!cachedCities) {
                // If not cached, fetch from external API using circuit breaker
                cachedCities = await this.breaker.exec(() => this.getCityListExternalAPI(city));
            }
            return cachedCities;
        } catch (err) {
            // Circuit breaker open or API failure, respond with error
            throw {
                status: 500,
                message: 'City autocomplete API/circuit breaker failure',
            };
        }
    }

}