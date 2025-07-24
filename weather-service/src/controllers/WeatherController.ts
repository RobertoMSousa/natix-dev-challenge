import { Request, Response } from 'express';
import { WeatherService } from '../services/WeatherService';

export class WeatherController { // do not control the weather :-D
    constructor(private weatherService: WeatherService) { }

    async fetchWeather(_req: Request, res: Response) {
        const data = await this.weatherService.fetchWeather();
        res.json(data);
    }
}
