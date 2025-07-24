
export class WeatherService {

    constructor() {
    }

    async fetchWeather() {
        return {
            "weather": [
                { "hour": 0, "temperature": "18", "condition": "Clear" },
                { "hour": 1, "temperature": "17", "condition": "Clear" },
                { "hour": 23, "temperature": "16", "condition": "Cloudy" }
            ],
        }
    }
}
