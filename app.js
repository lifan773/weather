const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const errorMsg = document.getElementById('errorMsg');
const emptyState = document.getElementById('emptyState');
const currentCard = document.getElementById('currentCard');
const forecastSection = document.getElementById('forecastSection');

// Allow Enter key to trigger search
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

searchBtn.addEventListener('click', async () => {
  const city = cityInput.value.trim();
  if (!city) {
    showError('Please enter a city name.');
    return;
  }

  if (typeof API_KEY === 'undefined' || API_KEY === 'YOUR_API_KEY_HERE') {
    showError('Please set your API key in config.js.');
    return;
  }

  hideError();
  searchBtn.disabled = true;
  searchBtn.textContent = 'Loading...';

  try {
    const [current, forecast] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=imperial`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=imperial`),
    ]);

    if (!current.ok) {
      const err = await current.json().catch(() => ({}));
      throw new Error(err.message || 'City not found.');
    }
    if (!forecast.ok) {
      const err = await forecast.json().catch(() => ({}));
      throw new Error(err.message || 'Could not load forecast.');
    }

    const currentData = await current.json();
    const forecastData = await forecast.json();

    renderCurrentWeather(currentData);
    renderForecast(forecastData);

    emptyState.style.display = 'none';
  } catch (err) {
    showError(err.message || 'Something went wrong. Try again.');
    currentCard.classList.remove('visible');
    forecastSection.classList.remove('visible');
    emptyState.style.display = '';
    document.getElementById('cityName').textContent = '';
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
});

function renderCurrentWeather(data) {
  document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
  document.getElementById('conditionText').textContent = data.weather[0].description;
  document.getElementById('tempValue').innerHTML = `${Math.round(data.main.temp)}<span class="detail-unit">&deg;F</span>`;
  document.getElementById('humidityValue').innerHTML = `${data.main.humidity}<span class="detail-unit">%</span>`;

  const iconCode = data.weather[0].icon;
  document.getElementById('weatherIconLarge').src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  document.getElementById('weatherIconLarge').alt = data.weather[0].description;

  currentCard.classList.add('visible');
}

function renderForecast(data) {
  // Group 3-hour entries by day and compute daily high / low
  const daily = {};

  data.list.forEach((entry) => {
    const date = entry.dt_txt.split(' ')[0];
    if (!daily[date]) {
      daily[date] = { highs: [], lows: [], icons: [], descriptions: [] };
    }
    daily[date].highs.push(entry.main.temp_max);
    daily[date].lows.push(entry.main.temp_min);
    daily[date].icons.push(entry.weather[0].icon);
    daily[date].descriptions.push(entry.weather[0].description);
  });

  // Take only the first 5 days (includes today)
  const days = Object.keys(daily).slice(0, 5);

  const listEl = document.getElementById('forecastList');
  listEl.innerHTML = '';

  days.forEach((dateStr) => {
    const d = daily[dateStr];
    const high = Math.round(Math.max(...d.highs));
    const low = Math.round(Math.min(...d.lows));
    const icon = d.icons[4] || d.icons[0];

    const date = new Date(dateStr + 'T12:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <div style="font-size:11px;color:#9db5d6;margin-top:-4px;margin-bottom:8px">${monthDay}</div>
      <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}.png" alt="" />
      <div class="forecast-high">${high}&deg;</div>
      <div class="forecast-low">${low}&deg;</div>
    `;
    listEl.appendChild(card);
  });

  forecastSection.classList.add('visible');
}

function showError(msg) {
  errorMsg.textContent = msg;
}

function hideError() {
  errorMsg.textContent = '';
}
