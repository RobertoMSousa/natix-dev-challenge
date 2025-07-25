

# Resilient Weather Service
build a backend API that exposes weather data to a frontend. The frontend requests the today's weather for the city the user is in — there's a catch: the only way to get weather information is via an external weather API that is rate-limited.

Your goal is to design a resilient backend that:
- Moderates (minimizes) calls to the external weather API
- Handles API failures gracefully



# Diagram and algorithm
	1.	User sends request to /weather?city=Lisbon.
	2.	WeatherController receives the request.
	3.	WeatherService:
    •	Check cache: Looks up Redis for key weather:lisbon:YYYY-MM-DD.
    •	If cache hit: Returns data. (TTL 1 Day)
    •	If cache miss:
      a. Uses Circuit Breaker (CB) to call the external WeatherAPI.
      b. On success: caches and returns result.
      c. On failure: returns error (status 500).
  4.	CityService (for autocomplete):
    •	Check cache: Looks up Redis for key city:lisbon.
    •	If cache hit: Returns city list.
    •	If cache miss: (TTL 1 Week)
        a. Uses CB to call external API.
        b. On success: caches and returns list.
        c. On failure: returns error (status 500).



## 🌤️ Weather API Endpoint

### `GET /api/v1/weather?city={cityQuery}`

Fetch today’s weather forecast for a city name or partial city name. The endpoint also returns an array of matching city suggestions for autocomplete.

**Weather data and city autocomplete suggestions are both cached to ensure high performance and minimize external API usage.**

---

#### **Query Parameters**
| Name      | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| `city`    | string | yes      | City name or fragment for search.     |

---

#### **Example Response**

```json
{
  "weather": {
    "city": "Hamburg",
    "country": "Germany",
    "date": "2025-07-25",
    "last_updated": "2025-07-25T11:45:00.000Z",
    "sunrise": "05:25 AM",
    "sunset": "09:28 PM",
    "weather": [
      {
        "hour": 0,
        "temperature": 17.1,
        "condition": "Mist",
        "condition_icon": "//cdn.weatherapi.com/weather/64x64/night/143.png",
        "wind_kph": 12.2,
        "wind_dir": "W",
        "humidity": 96,
        "precip_mm": 0,
        "cloud": 91,
        "feelslike": 17.1,
        "will_it_rain": false,
        "chance_of_rain": 0,
        "uv": 0
      }
      // ... up to 23, one per hour
    ]
  },
  "source": "live", // or "cache"
  "cities": [
    {
      "id": 585936,
      "name": "Hamburg",
      "region": "Hamburg",
      "country": "Germany",
      "lat": 53.55,
      "lon": 10,
      "url": "hamburg-hamburg-germany"
    },
    ...
  ]
}
```

### Field Descriptions
	•	weather
     Object with the forecast for the best-matched city for today.
       •	The weather.weather array contains 24 hourly weather objects.
       •	Weather for each city is cached for 1 day.
  •	source
     String. "cache" if data is served from local cache, "live" if freshly fetched from the external weather provider.
  •	cities
      Array of city objects matching the input search, intended for autocomplete or disambiguation in the frontend UI.
        •	The first element is usually the city used for the weather forecast.
        •	City autocomplete results are cached for 1 week per search term.


### Usage Notes
	•	When a user types a city name (full or partial), the API will:
	•	Return the best-matched city’s weather in weather.
	•	Return a list of matching cities in cities, for the frontend to use as autocomplete or to offer the user options in case of ambiguity.
	•	Both weather and city lists are cached to maximize speed and respect external API rate limits.
	•	Data will refresh automatically if not present or when the cache expires.



# 🚀 How to Run

1. **Start Redis (using Docker):**
   ```bash
    docker run --name redis -p 6379:6379 -d redis
   ```
2. **Get an API Key:**
	•	Sign up at https://www.weatherapi.com/ and generate a free API key.

3. **Configure the Project:**
	•	Add your WeatherAPI key to your .env file or update the configuration as required by the project.

4. **Install dependencies:**
  ```bash
    npm i
   ```
5. **Run the project:**
  ```bash
    npm run dev
   ```


# 🧪 Testing

The project includes comprehensive unit tests for the service layer, focusing on:
	•	WeatherService:
	•	Returns cached weather if present
	•	Fetches live data and caches it on cache miss
	•	Handles API failures (circuit breaker, external errors)
	•	Falls back to stale cache (if logic implemented)
	•	TTL is handled at the Redis layer
	•	CityService:
	•	Returns cached city list if present
	•	Fetches and caches new city search results on cache miss
	•	Handles API/circuit breaker failures
	•	Cache TTL logic is enforced by Redis


## 🟡 Suggestions of improvemt
  
  1. API Input Validation using JOI instead of validate on the controller

  2. Rate Limiting for Public Endpoint

  3. Logging with Winston for errors, circuit breaker events, cache misses, and API failures.

  4. OpenAPI/Swagger Docs

  5. Code Coverage



## Context and Scope
1. The external weather API is limited to 100 requests per hour.
2. The external weather API returns detailed weather data for a given city on the current day everytime it's called. As shown in the example
3. You must support approx. 100,000 daily active users across approx. 2,500 different cities across the globe. Users use the service at any time throughout the day.
4. User authentication and external API authentication are out of scope of this task. Simply assume that the API you develop will be open to any call and the external weather API will reply to requests coming from our cluster according to the limit mentioned in 1.


Example of response for a passed city to the external weather API - The result is the weather for today

```
{
  "result": [
    { "hour": 0, "temperature": "18°C", "condition": "Clear" },
    { "hour": 1, "temperature": "17°C", "condition": "Clear" },
    ...
    { "hour": 23, "temperature": "16°C", "condition": "Cloudy" }
  ]
}
```



## Endpoint Base Info

``` GET /weather?city=CityName ```


Response:
```
{
  "weather": [
    { "hour": 0, "temperature": "18", "condition": "Clear" },
    { "hour": 1, "temperature": "17", "condition": "Clear" },
    ...
    { "hour": 23, "temperature": "16", "condition": "Cloudy" }
  ],
   …
}
```
  


## 🧪 Acceptance Criteria
- You may use any programming language. Even pseudocode or structured texts (e.g. workflow-style logic in written fromat) is acceptable — what matters is the clarity and quality of your technical design and solution.
- You may mock any libraries or databases you need. The focus is not on third-party integerations.
- Write down any assumptions — either as comments in the code or as side notes in a document.
- Clearly describe the input and output of each major function/step in your solution. This helps us understand your reasoning behind your technical design.
- Improve the response object: the example provided is minimal. Based on your experience, design a response that communicates effectively with the frontend/UI.

