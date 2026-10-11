# Weather-Dashboard
# Weatherly — Weather Dashboard

A responsive weather dashboard built with plain HTML, CSS, and JavaScript. It retrieves live weather data and location search results from Open-Meteo.

## Features

- Search for cities and other locations indexed by the geocoding service.
- Prefers Indian search results when matching results are available.
- Current temperature, condition, feels-like temperature, humidity, wind speed, rain probability, and UV index.
- Eight-point hourly forecast and 7-day forecast.
- Weather-dependent colour themes and condition icons.
- Loading messages, error handling, and unavailable-data fallbacks.
- Responsive layout for desktop, tablet, and mobile.
- No API key or third-party JavaScript package required for basic use.

## Files

- `index.html` — page structure
- `style.css` — layout, responsive styling, and weather themes
- `script.js` — location search, API requests, rendering, and error handling

## Run locally

1. Download or copy this project into a folder.
2. Open `index.html` in a modern browser.
3. Ensure the device has an internet connection.
4. Search for a location and select the correct result.

A local development server is optional; no package installation is needed for this plain HTML/CSS/JS version. If your browser blocks requests when opening a local file, use VS Code's Live Server extension only if it is already installed, or use a simple static hosting service you trust.

## APIs used

### Open-Meteo Geocoding API

`https://geocoding-api.open-meteo.com/v1/search`

Used to search for place names and obtain coordinates. The service returns a limited number of matches per query, so not every village, district, or PIN code is guaranteed to be indexed. If a name has multiple matches, choose the correct state/region from the results.

### Open-Meteo Forecast API

`https://api.open-meteo.com/v1/forecast`

Used to fetch current weather, hourly data, and daily forecast for the selected coordinates. Basic use does not require an API key. Availability, coverage, and rate limits depend on the API service.

Weather values are forecasts/model data and may differ from conditions at a nearby weather station.

## Troubleshooting

- **No search results:** Check spelling, try the state name too, or use a nearby larger town.
- **Weather doesn't load:** Check your internet connection and retry.
- **API busy / rate limit:** Wait briefly and try again.
- **Blank screen or styling missing:** Confirm all three files are in the same folder and the filenames are exactly `index.html`, `style.css`, and `script.js`.

## Privacy and safety

This project does not request your precise device location, does not ask for passwords, and does not store personal data. A location is only searched when you enter it or use a sample city button. Search terms and selected coordinates are sent to Open-Meteo to retrieve results and forecasts.


## GitHub publishing checklist

1. Create a new public repository named `weather-dashboard` on GitHub.
2. Upload only `index.html`, `style.css`, `script.js`, and `README.md`.
3. Check the repository page to confirm all files are visible.
4. Open the deployed/local app and test at least two different locations.
5. Submit the public repository URL in your assignment form.

