import { apiKey, apiUri } from '../config';
import { redis } from '../utils/redis';
import { CircuitBreaker } from '../utils/circuitBreaker';



import {
    HourlyWeather,
    CachedWeather,
    WeatherResponse,
    CityResult
} from '../types/WeatherTypes';

/**
 * Service responsible for fetching weather data and city search results,
 * utilizing caching with Redis and a circuit breaker pattern to improve
 * reliability and reduce external API calls.
 */
export class WeatherService {
    // Cache TTL: 1 day (86400 seconds)
    private cacheTTL = 86400;
    // private cacheCityTTL = 604800; // 1 week
    private breaker = new CircuitBreaker(5, 30000, 5000); // (maxFailures, openTimeout, callTimeout)

    /**
     * Generates a unique Redis cache key for weather data based on city and date.
     * @param city - The city name
     * @param date - The date string in YYYY-MM-DD format
     * @returns The cache key string
     */
    private getCacheKey(city: string, date: string) {
        return `weather:${city.toLowerCase()}:${date}`;
    }


    /**
     * Retrieves weather data from Redis cache for a given city and date.
     * @param city - The city name
     * @param date - The date string in YYYY-MM-DD format
     * @returns The cached weather data or null if not found
     */
    async getWeatherFromCache(city: string, date: string) {
        const cacheKey = this.getCacheKey(city, date);
        const cached = await redis.get(cacheKey);
        // Parse cached JSON if exists, else return null
        return cached ? JSON.parse(cached) : null;
    }



    /**
     * Saves weather data to Redis cache with expiry.
     * @param city - The city name
     * @param date - The date string in YYYY-MM-DD format
     * @param data - The weather data to cache
     * @returns Promise that resolves when cache is set
     */
    async setWeatherCache(city: string, date: string, data: any) {
        const cacheKey = this.getCacheKey(city, date);
        // Store serialized data with expiration time (TTL)
        await redis.set(cacheKey, JSON.stringify(data), 'EX', this.cacheTTL);
    }

    /**
     * Maps the raw API JSON response to the internal CachedWeather format.
     * Extracts relevant weather and forecast information.
     * @param apiJson - The JSON response from the weather API
     * @returns The mapped CachedWeather object
     */
    mapApiToCachedWeather(apiJson: any): CachedWeather {
        const forecast = apiJson.forecast?.forecastday?.[0];
        // Map each hourly forecast to internal HourlyWeather format
        const hours = (forecast?.hour || []).map((h: any) => ({
            hour: new Date(h.time).getHours(),
            temperature: h.temp_c,
            condition: h.condition?.text || '',
            condition_icon: h.condition?.icon || '',
            wind_kph: h.wind_kph,
            wind_dir: h.wind_dir,
            humidity: h.humidity,
            precip_mm: h.precip_mm,
            cloud: h.cloud,
            feelslike: h.feelslike_c,
            will_it_rain: !!h.will_it_rain,
            chance_of_rain: h.chance_of_rain,
            uv: h.uv,
        }));

        return {
            city: apiJson.location?.name || '',
            country: apiJson.location?.country || '',
            date: forecast?.date || '',
            last_updated: apiJson.current?.last_updated
                ? new Date(apiJson.current.last_updated).toISOString()
                : new Date().toISOString(),
            sunrise: forecast?.astro?.sunrise || '',
            sunset: forecast?.astro?.sunset || '',
            weather: hours,
        };
    }

    /**
     * Fetches weather data from the external weather API for a given city and date.
     * Maps and caches the result before returning.
     * @param city - The city name
     * @param date - The date string in YYYY-MM-DD format
     * @returns The mapped CachedWeather data
     * @throws Error if the API request fails or returns a non-OK status
     */
    async getWeatherExternalAPI(city: string, date: string) {
        const endpoint = `${apiUri}/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=1&aqi=no&alerts=no`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                // Throw error if API response status is not successful
                throw new Error(`Weather API request failed with status ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();

            // Map API response to internal format
            const mapped = this.mapApiToCachedWeather(data);
            // Cache the mapped weather data for future requests
            await this.setWeatherCache(city, date, mapped);
            return mapped;
        } catch (error: any) {
            // Propagate error with descriptive message
            throw new Error(`Failed to fetch weather data: ${error.message || error}`);
        }
    }

    /**
     * Main method to retrieve weather data and city autocomplete results.
     * Utilizes cache first, falls back to external API if cache is missing.
     * Employs circuit breaker pattern to handle external API failures gracefully.
     * @param city - The city name or search query
     * @returns An object containing weather data, city list, and data source info
     * @throws Object with status 500 if both cache and API fail due to circuit breaker
     */
    async getWeather(city: string) {

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Try to retrieve cached weather data for the city and date
        const cached = await this.getWeatherFromCache(city, today);
        if (cached) {
            // Return cached data immediately if found
            return { weather: cached, source: 'cache' };
        }

        // If weather data not cached, fetch from external API using circuit breaker
        try {
            const data = await this.breaker.exec(() => this.getWeatherExternalAPI(city, today));
            return { weather: data, source: "live" };
        } catch (err) {
            // Circuit breaker open or API failure, respond with error
            throw {
                status: 500,
                message: 'Weather API/circuit breaker failure',
            };
        }
    }
}