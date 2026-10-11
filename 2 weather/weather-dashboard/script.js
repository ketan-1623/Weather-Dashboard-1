/*
 * Weatherly — Weather Dashboard
 * Weather API: Open-Meteo (no API key required for this basic use)
 * Location search: Open-Meteo Geocoding API
 */

"use strict";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const elements = {
  form: document.querySelector("#search-form"),
  search: document.querySelector("#location-search"),
  searchButton: document.querySelector("#search-button"),
  results: document.querySelector("#search-results"),
  status: document.querySelector("#status-message"),
  panel: document.querySelector("#weather-panel"),
  empty: document.querySelector("#empty-state"),
  placeName: document.querySelector("#place-name"),
  placeMeta: document.querySelector("#place-meta"),
  updatedAt: document.querySelector("#updated-at"),
  temperature: document.querySelector("#temperature"),
  condition: document.querySelector("#condition"),
  feelsLike: document.querySelector("#feels-like"),
  illustration: document.querySelector("#weather-illustration"),
  humidity: document.querySelector("#humidity"),
  windSpeed: document.querySelector("#wind-speed"),
  rainChance: document.querySelector("#rain-chance"),
  uvIndex: document.querySelector("#uv-index"),
  hourly: document.querySelector("#hourly-forecast"),
  daily: document.querySelector("#daily-forecast"),
  refresh: document.querySelector("#refresh-button")
};

let searchTimer = null;
let activeSearchController = null;
let weatherController = null;
let selectedLocation = null;
let requestNumber = 0;

const WEATHER_CODES = {
  0: ["Clear sky", "☀️", "sunny"],
  1: ["Mainly clear", "🌤️", "sunny"],
  2: ["Partly cloudy", "⛅", "cloudy"],
  3: ["Overcast", "☁️", "cloudy"],
  45: ["Fog", "🌫️", "foggy"],
  48: ["Depositing rime fog", "🌫️", "foggy"],
  51: ["Light drizzle", "🌦️", "rainy"],
  53: ["Moderate drizzle", "🌦️", "rainy"],
  55: ["Dense drizzle", "🌧️", "rainy"],
  56: ["Light freezing drizzle", "🌧️", "rainy"],
  57: ["Dense freezing drizzle", "🌧️", "rainy"],
  61: ["Slight rain", "🌧️", "rainy"],
  63: ["Moderate rain", "🌧️", "rainy"],
  65: ["Heavy rain", "🌧️", "rainy"],
  66: ["Light freezing rain", "🌧️", "rainy"],
  67: ["Heavy freezing rain", "🌧️", "rainy"],
  71: ["Slight snowfall", "🌨️", "snowy"],
  73: ["Moderate snowfall", "🌨️", "snowy"],
  75: ["Heavy snowfall", "❄️", "snowy"],
  77: ["Snow grains", "🌨️", "snowy"],
  80: ["Slight rain showers", "🌦️", "rainy"],
  81: ["Moderate rain showers", "🌧️", "rainy"],
  82: ["Violent rain showers", "⛈️", "stormy"],
  85: ["Slight snow showers", "🌨️", "snowy"],
  86: ["Heavy snow showers", "❄️", "snowy"],
  95: ["Thunderstorm", "⛈️", "stormy"],
  96: ["Thunderstorm with hail", "⛈️", "stormy"],
  99: ["Thunderstorm with heavy hail", "⛈️", "stormy"]
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || ["Conditions unavailable", "🌡️", "cloudy"];
}

function setStatus(message = "", type = "") {
  elements.status.textContent = message;
  elements.status.className = `status-message${type ? ` ${type}` : ""}`;
}

function setSearchBusy(busy) {
  elements.searchButton.disabled = busy;
  elements.searchButton.textContent = busy ? "Searching…" : "Search";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function locationLabel(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index).join(", ");
}

function makeLocationResult(place) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "result-option";
  button.setAttribute("role", "option");
  button.innerHTML = `<span class="result-name">${escapeHtml(place.name)}</span>
    <span class="result-meta">${escapeHtml([place.admin1, place.admin2, place.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · "))}</span>`;
  button.addEventListener("click", () => {
    elements.search.value = locationLabel(place);
    elements.results.hidden = true;
    loadWeather(place);
  });
  return button;
}

async function searchLocations(query, { autoSelectSingle = false } = {}) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    elements.results.hidden = true;
    elements.results.replaceChildren();
    return;
  }

  if (activeSearchController) activeSearchController.abort();
  activeSearchController = new AbortController();
  const controller = activeSearchController;

  try {
    setSearchBusy(true);
    const baseParams = {
      name: trimmed,
      count: "20",
      language: "en",
      format: "json"
    };
    // Search India first so common names are more likely to show Indian matches.
    // If there are no Indian matches, fall back to worldwide locations.
    let params = new URLSearchParams({ ...baseParams, countryCode: "IN" });
    let response = await fetch(`${GEOCODING_URL}?${params.toString()}`, { signal: controller.signal });
    if (!response.ok) throw new Error("Location search is temporarily unavailable.");
    let data = await response.json();
    let results = Array.isArray(data.results) ? data.results : [];

    if (!results.length) {
      params = new URLSearchParams(baseParams);
      response = await fetch(`${GEOCODING_URL}?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Location search is temporarily unavailable.");
      data = await response.json();
      results = Array.isArray(data.results) ? data.results : [];
    }

    if (controller !== activeSearchController) return;
    elements.results.replaceChildren();

    if (!results.length) {
      elements.results.hidden = false;
      const message = document.createElement("div");
      message.className = "result-option";
      message.textContent = "No matching locations found. Try another spelling or add the state name.";
      elements.results.append(message);
      return;
    }

    results.forEach((place) => elements.results.append(makeLocationResult(place)));
    elements.results.hidden = false;

    if (autoSelectSingle && results.length === 1) {
      elements.results.hidden = true;
      elements.search.value = locationLabel(results[0]);
      await loadWeather(results[0]);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus("Location search failed. Check your internet connection and try again.", "error");
      elements.results.hidden = true;
    }
  } finally {
    if (controller === activeSearchController) setSearchBusy(false);
  }
}

function getForecastDescription(code) {
  return getWeatherInfo(code)[0];
}

function formatHour(isoDateTime, timezone) {
  try {
    const date = new Date(isoDateTime);
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: true,
      timeZone: timezone
    }).format(date);
  } catch {
    return isoDateTime.slice(11, 16);
  }
}

function formatDay(isoDate, index, timezone) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      timeZone: timezone
    }).format(new Date(`${isoDate}T12:00:00`));
  } catch {
    return isoDate;
  }
}

function formatUpdatedTime(isoDateTime, timezone) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone
    }).format(new Date(isoDateTime));
  } catch {
    return isoDateTime.replace("T", " ");
  }
}

function numeric(value, digits = 0) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : "—";
}

function setTheme(theme) {
  document.body.classList.remove("theme-sunny", "theme-rainy", "theme-cloudy", "theme-snowy", "theme-stormy", "theme-foggy");
  document.body.classList.add(`theme-${theme}`);
}

function setForecastLoading() {
  elements.hourly.innerHTML = '<p class="muted">Loading hourly forecast…</p>';
  elements.daily.innerHTML = '<p class="muted">Loading daily forecast…</p>';
}

function renderHourly(data, timezone) {
  const hourly = data.hourly;
  if (!hourly || !Array.isArray(hourly.time) || !hourly.time.length) {
    elements.hourly.innerHTML = '<p class="muted">Hourly forecast is not available for this location.</p>';
    return;
  }

  const now = data.current?.time || new Date().toISOString().slice(0, 16);
  let startIndex = hourly.time.findIndex((time) => time >= now.slice(0, 16));
  if (startIndex < 0) startIndex = 0;
  const endIndex = Math.min(startIndex + 8, hourly.time.length);
  const fragment = document.createDocumentFragment();

  for (let i = startIndex; i < endIndex; i++) {
    const info = getWeatherInfo(hourly.weather_code?.[i]);
    const item = document.createElement("article");
    item.className = "hour-item";
    item.innerHTML = `
      <p class="hour-time">${escapeHtml(i === startIndex ? "Now" : formatHour(hourly.time[i], timezone))}</p>
      <div class="hour-icon" aria-label="${escapeHtml(info[0])}" title="${escapeHtml(info[0])}">${info[1]}</div>
      <div class="hour-temp">${escapeHtml(numeric(hourly.temperature_2m?.[i]))}°</div>`;
    fragment.append(item);
  }
  elements.hourly.replaceChildren(fragment);
}

function renderDaily(data, timezone) {
  const daily = data.daily;
  if (!daily || !Array.isArray(daily.time) || !daily.time.length) {
    elements.daily.innerHTML = '<p class="muted">Daily forecast is not available for this location.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  daily.time.slice(0, 7).forEach((date, index) => {
    const info = getWeatherInfo(daily.weather_code?.[index]);
    const rain = daily.precipitation_probability_max?.[index];
    const rainText = Number.isFinite(rain) ? `${Math.round(rain)}% rain` : "—";
    const row = document.createElement("div");
    row.className = "day-row";
    row.innerHTML = `
      <div class="day-name">${escapeHtml(formatDay(date, index, timezone))}</div>
      <div class="day-condition"><span class="day-icon" aria-label="${escapeHtml(info[0])}">${info[1]}</span><span>${escapeHtml(info[0])}</span></div>
      <div class="day-rain">${escapeHtml(rainText)}</div>
      <div class="day-temps"><span>${escapeHtml(numeric(daily.temperature_2m_max?.[index]))}°</span><span class="low">${escapeHtml(numeric(daily.temperature_2m_min?.[index]))}°</span></div>`;
    fragment.append(row);
  });
  elements.daily.replaceChildren(fragment);
}

function renderWeather(data, place) {
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  if (!current || !Number.isFinite(current.temperature_2m)) {
    throw new Error("The weather service did not return current conditions for this location.");
  }

  const info = getWeatherInfo(current.weather_code);
  selectedLocation = place;
  elements.placeName.textContent = place.name || "Selected location";
  elements.placeMeta.textContent = [place.admin1, place.country].filter(Boolean).join(", ");
  elements.updatedAt.textContent = `Updated ${formatUpdatedTime(current.time, data.timezone || "auto")}`;
  elements.temperature.textContent = numeric(current.temperature_2m);
  elements.condition.textContent = info[0];
  elements.feelsLike.textContent = `${numeric(current.apparent_temperature)}°C`;
  elements.illustration.textContent = info[1];
  elements.humidity.textContent = Number.isFinite(current.relative_humidity_2m) ? `${Math.round(current.relative_humidity_2m)}%` : "—";
  elements.windSpeed.textContent = Number.isFinite(current.wind_speed_10m) ? `${numeric(current.wind_speed_10m)} km/h` : "—";
  const rain = hourly?.precipitation_probability?.[0];
  elements.rainChance.textContent = Number.isFinite(rain) ? `${Math.round(rain)}%` : "—";
  elements.uvIndex.textContent = Number.isFinite(daily?.uv_index_max?.[0]) ? numeric(daily.uv_index_max[0], 1) : "—";
  setTheme(info[2]);
  renderHourly(data, data.timezone || "auto");
  renderDaily(data, data.timezone || "auto");
  elements.panel.hidden = false;
  elements.empty.hidden = true;
}

async function loadWeather(place) {
  const thisRequest = ++requestNumber;
  if (weatherController) weatherController.abort();
  weatherController = new AbortController();
  const controller = weatherController;

  elements.results.hidden = true;
  setStatus(`Loading live weather for ${place.name || "your location"}…`);
  elements.panel.hidden = false;
  elements.empty.hidden = true;
  elements.placeName.textContent = place.name || "Selected location";
  elements.placeMeta.textContent = [place.admin1, place.country].filter(Boolean).join(", ");
  elements.condition.textContent = "Fetching current conditions…";
  elements.temperature.textContent = "—";
  elements.illustration.textContent = "🌤️";
  setForecastLoading();

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    timezone: "auto",
    forecast_days: "7"
  });

  try {
    const response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal: controller.signal });
    if (!response.ok) {
      if (response.status === 429) throw new Error("The weather service is busy. Please wait a moment and try again.");
      throw new Error("Weather data could not be loaded right now. Please try again.");
    }
    const data = await response.json();
    if (thisRequest !== requestNumber) return;
    renderWeather(data, place);
    setStatus("Weather updated successfully.", "success");
    window.setTimeout(() => {
      if (elements.status.textContent === "Weather updated successfully.") setStatus("");
    }, 3000);
  } catch (error) {
    if (error.name === "AbortError") return;
    if (thisRequest !== requestNumber) return;
    elements.panel.hidden = true;
    elements.empty.hidden = false;
    setStatus(error.message || "Something went wrong while loading weather. Check your connection and try again.", "error");
  }
}

elements.search.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  const query = elements.search.value;
  if (query.trim().length < 2) {
    elements.results.hidden = true;
    elements.results.replaceChildren();
    return;
  }
  searchTimer = window.setTimeout(() => searchLocations(query), 350);
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = elements.search.value.trim();
  if (query.length < 2) {
    setStatus("Please type at least 2 letters to search for a location.", "error");
    return;
  }
  await searchLocations(query, { autoSelectSingle: true });
  if (!elements.results.hidden) {
    setStatus("Choose a matching location from the search results. Add a state name if needed.");
  }
});

elements.refresh.addEventListener("click", () => {
  if (selectedLocation) loadWeather(selectedLocation);
});

document.querySelectorAll("[data-city]").forEach((button) => {
  button.addEventListener("click", async () => {
    const city = button.dataset.city;
    elements.search.value = city;
    await searchLocations(city, { autoSelectSingle: true });
    if (!elements.results.hidden) {
      // Prefer a matching result for the quick city chips.
      const buttons = [...elements.results.querySelectorAll(".result-option")];
      const match = buttons.find((item) => item.querySelector(".result-name")?.textContent.toLowerCase() === city.toLowerCase());
      if (match) match.click();
    }
  });
});

document.addEventListener("click", (event) => {
  if (!elements.form.contains(event.target)) elements.results.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") elements.results.hidden = true;
});

// Load a useful default location on startup so the dashboard isn't empty.
(async function initializeDashboard() {
  const defaultCity = "Bhopal";
  elements.search.value = defaultCity;
  await searchLocations(defaultCity);
  // Select an exact Bhopal match for a useful first view, if the service returns one.
  const matches = [...elements.results.querySelectorAll(".result-option")];
  const exactMatch = matches.find((item) =>
    item.querySelector(".result-name")?.textContent.trim().toLowerCase() === defaultCity.toLowerCase()
  );
  if (exactMatch) {
    exactMatch.click();
  } else if (elements.panel.hidden) {
    elements.results.hidden = true;
    setStatus("Search for a location to get started. Weather requires an internet connection.");
  }
})();
