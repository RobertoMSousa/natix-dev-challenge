import { Request, Response } from 'express';
import { WeatherService } from '../services/WeatherService';

export class WeatherController { // do not control the weather :-D
    constructor(private weatherService: WeatherService) { }

    async fetchWeather(req: Request, res: Response) {

        const city = req.query.city as string;  // <-- Grab the query parameter

        if (!city) {
            return res.status(400).json({ error: 'City is required' });
        }
        const data = await this.weatherService.getWeather(city);
        res.json(data);
    }
}
