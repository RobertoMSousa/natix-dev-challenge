import { Request, Response } from 'express';
import { WeatherService } from '../services/WeatherService';
import { CityService } from '../services/CityService';

/**
 * Controller responsible for handling weather-related HTTP requests.
 * It acts as an intermediary between the client requests and the WeatherService.
 * WARNING: do not control the actual weather :-D
 */
export class WeatherController {
    /**
     * Initializes the controller with a WeatherService instance.
     * @param weatherService - Service to fetch weather data.
     */
    constructor(private weatherService: WeatherService, private cityService: CityService) { }

    /**
     * Handles fetching weather information for a given city.
     * Extracts the city parameter from the query string, validates it,
     * and returns weather data or appropriate error responses.
     * 
     * @param req - Express request object containing query parameters.
     * @param res - Express response object used to send back data or errors.
     */
    async fetchWeather(req: Request, res: Response) {

        try {
            // Extract city from query parameters and cast to string
            const city = req.query.city as string;

            // Validate that city parameter is provided
            if (!city) {
                // Respond with 400 Bad Request if city is missing
                return res.status(400).json({ error: 'City is required' });
            }

            // Fetch weather data using the WeatherService
            // const data = await this.weatherService.getWeather(city);

            const cities = await this.cityService.getCity(city);

            // Optionally pick one city from the list (e.g., by ID, or the first match)
            // const selectedCity = cities[0];
            if (cities.length < 1) {
                return res.status(404).json({ error: 'City not found' });
            }

            // Pass the selected city's name or id/coords to WeatherService
            const data = await this.weatherService.getWeather(city);
            res.json({ ...data, cities });

        } catch (err: any) {
            // Handle any errors thrown during processing
            // Respond with error status or 500 if not specified
            // Include error message and optional detail for debugging
            res.status(err.status || 500).json({
                error: err.message || 'Unknown server error',
                detail: err.detail || undefined,
            });
        }
    }
}
