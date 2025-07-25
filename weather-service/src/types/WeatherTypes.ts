export type HourlyWeather = {
    hour: number;                // 0..23
    temperature: number;         // temp_c
    condition: string;           // condition.text
    condition_icon: string;      // condition.icon (absolute or relative url)
    wind_kph: number;
    wind_dir: string;
    humidity: number;
    precip_mm: number;
    cloud: number;
    feelslike: number;           // feelslike_c
    will_it_rain: boolean;
    chance_of_rain: number;      // chance_of_rain (percentage)
    uv: number;
};

export type CachedWeather = {
    city: string;                      // "London"
    country: string;                   // "United Kingdom"
    date: string;                      // "2025-07-24"
    last_updated: string;              // ISO8601 (from API or time cached)
    sunrise: string;                   // "05:13 AM"
    sunset: string;                    // "09:00 PM"
    weather: HourlyWeather[];          // 24 items
};

export type WeatherResponse = {
    city: string;
    region: string;                    // e.g., "City of London, Greater London"
    country: string;
    lat: number;
    lon: number;
    date: string;
    last_updated: string;
    sunrise: string;
    sunset: string;
    next_refresh_in_seconds: number;
    weather: HourlyWeather[];
    source: "cache" | "live";
    error: string | null;
};