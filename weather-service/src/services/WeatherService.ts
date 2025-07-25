import { apiKey, apiUri } from '../config';
import { redis } from '../utils/redis';
import { CircuitBreaker } from '../utils/circuitBreaker';



import {
    HourlyWeather,
    CachedWeather,
    WeatherResponse,
} from '../types/WeatherTypes';

export class WeatherService {
    // Cache TTL: 1 hour (3600 seconds)
    private cacheTTL = 3600;
    private breaker = new CircuitBreaker(5, 30000, 5000); // (maxFailures, openTimeout, callTimeout)

    // Generates a unique cache key
    private getCacheKey(city: string, date: string) {
        return `weather:${city.toLowerCase()}:${date}`;
    }

    // Fetch from Redis cache
    async getWeatherFromCache(city: string, date: string) {
        const cacheKey = this.getCacheKey(city, date);
        const cached = await redis.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }

    // Save to Redis cache
    async setWeatherCache(city: string, date: string, data: any) {
        const cacheKey = this.getCacheKey(city, date);
        await redis.set(cacheKey, JSON.stringify(data), 'EX', this.cacheTTL);
    }

    mapApiToCachedWeather(apiJson: any): CachedWeather {
        const forecast = apiJson.forecast?.forecastday?.[0];
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

    async getWeatherExternalAPI(city: string, date: string) {
        const endpoint = `${apiUri}${apiKey}&q=${encodeURIComponent(city)}&days=1&aqi=no&alerts=no`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Weather API request failed with status ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();

            // 3. Cache the API result
            const mapped = this.mapApiToCachedWeather(data);
            await this.setWeatherCache(city, date, mapped);
            return { ...mapped, source: 'live' };
        } catch (error: any) {
            throw new Error(`Failed to fetch weather data: ${error.message || error}`);
        }
    }

    // Main method: get weather, using cache
    async getWeather(city: string) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. Try cache
        const cached = await this.getWeatherFromCache(city, today);
        if (cached) {
            return { ...cached, source: 'cache' };
        }

        // 2. If not cached, call API
        try {
            const data = this.breaker.exec(() => this.getWeatherExternalAPI(city, today));
            return data;
        } catch (err) {
            // Handle circuit open (fallback to cache, return error, etc)

        }
    }
}