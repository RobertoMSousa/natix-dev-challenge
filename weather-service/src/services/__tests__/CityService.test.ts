import { CityService } from '../CityService';
import { redis } from '../../utils/redis';

// Use jest-fetch-mock or mock global.fetch
global.fetch = jest.fn();

// Mock Redis
jest.mock('../../utils/redis', () => ({
    redis: {
        get: jest.fn(),
        set: jest.fn(),
    },
}));

describe('CityService', () => {
    const service = new CityService();
    const sampleCities = [
        {
            id: 123,
            name: "London",
            region: "England",
            country: "United Kingdom",
            lat: 51.5,
            lon: -0.12,
            url: "london-england-united-kingdom"
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return cached city results if found', async () => {
        (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(sampleCities));

        const cities = await service.getCity('London');
        expect(cities).toEqual(sampleCities);
        expect(redis.get).toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch city results from API if not in cache', async () => {
        (redis.get as jest.Mock).mockResolvedValueOnce(null);
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => sampleCities
        });
        (redis.set as jest.Mock).mockResolvedValueOnce(null);

        const cities = await service.getCity('London');
        expect(fetch).toHaveBeenCalled();
        expect(redis.set).toHaveBeenCalled();
        expect(cities).toEqual(sampleCities);
    });

    it('should throw an error if the API call fails', async () => {
        (redis.get as jest.Mock).mockResolvedValueOnce(null);
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        });

        await expect(service.getCity('London')).rejects.toMatchObject({
            status: 500,
            message: expect.stringContaining('City autocomplete API/circuit breaker failure')
        });
    });

    // Test: should throw error when circuit breaker is open
    // We simulate the circuit breaker throwing an "OPEN" error when trying to fetch from API.
    it('should throw error when circuit breaker is open', async () => {
        (redis.get as jest.Mock).mockResolvedValueOnce(null);
        // Simulate circuit breaker throwing
        (global.fetch as jest.Mock).mockImplementationOnce(() => {
            const error = new Error('CircuitBreaker: OPEN');
            // Attach a custom property if your service expects it (optional)
            // @ts-ignore
            error.code = 'ECIRCUITOPEN';
            throw error;
        });
        await expect(service.getCity('London')).rejects.toMatchObject({
            status: 500,
            message: expect.stringMatching(`City autocomplete API/circuit breaker failure`)
        });
    });

    // Test: cache TTL logic
    // If the service does not check TTL explicitly, this is handled by Redis expiration.
    it('should rely on Redis expiry for cache TTL (no explicit TTL check in service)', async () => {
        // Simulate a cached object with a timestamp property in the past
        const expiredData = [{ ...sampleCities[0], timestamp: Date.now() - 1000000 }];
        (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(expiredData));
        // The service should still return the cached value, since it does not check TTL itself
        const cities = await service.getCity('London');
        expect(cities).toEqual(expiredData);
        // NOTE: TTL is enforced at Redis layer, not in CityService code.
    });

    // Test: fallback to cache when circuit breaker is open
    // If the service does NOT support fallback, document this by expecting error.
    it('should NOT fallback to cache when circuit breaker is open (returns error)', async () => {
        // Simulate cache miss first, then simulate cache hit for retry
        (redis.get as jest.Mock).mockResolvedValueOnce(null);
        // Next, simulate circuit breaker open error
        (global.fetch as jest.Mock).mockImplementationOnce(() => {
            throw new Error('CircuitBreaker: OPEN');
        });
        // If CityService supported fallback, we would mock redis.get to return cached data here.
        // But if it does not, we expect an error.
        await expect(service.getCity('London')).rejects.toMatchObject({
            status: 500,
            message: expect.stringMatching(`City autocomplete API/circuit breaker failure`)
        });
        // If fallback is added in the future, this test should be updated.
    });
});