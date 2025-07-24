import { Router, Request, Response } from 'express';

import { WeatherController } from '../controllers/WeatherController';
import { WeatherService } from '../services/WeatherService';
const WeatherRouter = Router();

const weatherService = new WeatherService();
const weatherController = new WeatherController(weatherService);


WeatherRouter.get('/', (req: Request, res: Response) => weatherController.fetchWeather(req, res));


export default WeatherRouter;