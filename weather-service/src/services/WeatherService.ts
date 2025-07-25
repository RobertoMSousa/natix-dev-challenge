import { apiKey, apiUri } from '../config';
import { redis } from '../utils/redis';
import { CircuitBreaker } from '../utils/circuitBreaker';



import {
    HourlyWeather,
    CachedWeather,
    WeatherResponse,
    CityResult
} from '../types/WeatherTypes';

export class WeatherService {
    // Cache TTL: 1 day (86400 seconds)
    private cacheTTL = 86400;
    private cacheCityTTL = 604800; // 1 week
    private breaker = new CircuitBreaker(5, 30000, 5000); // (maxFailures, openTimeout, callTimeout)

    // Generates a unique cache key
    private getCacheKey(city: string, date: string) {
        return `weather:${city.toLowerCase()}:${date}`;
    }
    private getCityCacheKey(city: string) {
        return `city:${city.toLowerCase()}`;
    }

    // Fetch from Redis cache
    async getWeatherFromCache(city: string, date: string) {
        const cacheKey = this.getCacheKey(city, date);
        const cached = await redis.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }
    async getCityFromCache(city: string) {
        const cacheKey = this.getCityCacheKey(city);
        const cached = await redis.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }

    // Save to Redis cache
    async setWeatherCache(city: string, date: string, data: any) {
        const cacheKey = this.getCacheKey(city, date);
        await redis.set(cacheKey, JSON.stringify(data), 'EX', this.cacheTTL);
    }

    async setCityCache(city: string, data: CityResult[]) {
        const cacheKey = this.getCityCacheKey(city);
        await redis.set(cacheKey, JSON.stringify(data), 'EX', this.cacheCityTTL);
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
        const endpoint = `${apiUri}/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=1&aqi=no&alerts=no`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Weather API request failed with status ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();

            // 3. Cache the API result
            const mapped = this.mapApiToCachedWeather(data);
            await this.setWeatherCache(city, date, mapped);
            return mapped;
        } catch (error: any) {
            throw new Error(`Failed to fetch weather data: ${error.message || error}`);
        }
    }

    async getCityListExternalAPI(city: string) {
        const endpoint = `${apiUri}/search.json?key=${apiKey}&q=${encodeURIComponent(city)}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Weather API request failed with status ${response.status}: ${response.statusText}`);
            }
            const data = await response.json() as CityResult[];

            await this.setCityCache(city, data);
            return { ...data, source: 'live' };
        } catch (error: any) {
            throw new Error(`Failed to fetch weather data: ${error.message || error}`);
        }
    }



    // Main method: get weather, using cache
    async getWeather(city: string) {

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // get the auto complete list and cache it
        let cachedCities = await this.getCityFromCache(city);
        console.log("🚀  roberto --  ~ WeatherService ~ getWeather ~ cachedCities 1:", cachedCities)
        if (!cachedCities) {
            cachedCities = await this.breaker.exec(() => this.getCityListExternalAPI(city));
            console.log("🚀  roberto --  ~ WeatherService ~ getWeather ~ cachedCities 2:", cachedCities)
        }

        // 1. Try cache
        const cached = await this.getWeatherFromCache(city, today);
        if (cached) {
            return { weather: cached, cities: cachedCities, source: 'cache' };
        }

        // 2. If not cached, call API
        try {
            const data = await this.breaker.exec(() => this.getWeatherExternalAPI(city, today));
            console.log("🚀  roberto --  ~ WeatherService ~ getWeather ~ data:", data)
            return { weather: data, cities: cachedCities, source: "live" };
        } catch (err) {
            // Handle circuit open (fallback to cache, return error, etc)
            throw {
                status: 500,
                message: 'Weather API/circuit breaker failure',
            };
        }
    }
}