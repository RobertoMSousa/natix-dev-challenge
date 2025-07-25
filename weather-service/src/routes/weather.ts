import { Router, Request, Response } from 'express';

import { WeatherController } from '../controllers';
import { WeatherService, CityService } from '../services';

const WeatherRouter = Router();

const weatherService = new WeatherService();
const cityService = new CityService();
const weatherController = new WeatherController(weatherService, cityService);


WeatherRouter.get('/', (req: Request, res: Response) => weatherController.fetchWeather(req, res));


export default WeatherRouter;