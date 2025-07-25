import { Request, Response } from 'express';
import { WeatherService } from '../services/WeatherService';

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
    constructor(private weatherService: WeatherService) { }

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
            const data = await this.weatherService.getWeather(city);

            // Respond with the retrieved weather data as JSON
            res.json(data);
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
