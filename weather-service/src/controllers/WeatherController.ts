import { Request, Response } from 'express';
import { WeatherService } from '../services/WeatherService';

export class WeatherController { // WARNING: do not control the weather :-D
    constructor(private weatherService: WeatherService) { }

    async fetchWeather(req: Request, res: Response) {

        try {
            const city = req.query.city as string;

            if (!city) {
                return res.status(400).json({ error: 'City is required' });
            }
            const data = await this.weatherService.getWeather(city);
            res.json(data);
        } catch (err: any) {
            res.status(err.status || 500).json({
                error: err.message || 'Unknown server error',
                detail: err.detail || undefined,
            });
        }
    }
}
