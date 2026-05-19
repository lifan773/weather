// --- i18n ---
const translations = {
  en: {
    title: 'Weather Dashboard',
    placeholder: 'Enter a city name...',
    searchBtn: 'Search',
    loading: 'Loading...',
    emptyState: 'Search for a city to see the weather',
    forecastTitle: '5-Day Forecast',
    temperature: 'Temperature',
    humidity: 'Humidity',
    apiHint: 'Get a free API key at',
    enterCity: 'Please enter a city name.',
    setApiKey: 'Please set your API key in config.js.',
    cityNotFound: 'City not found.',
    forecastError: 'Could not load forecast.',
    unknownError: 'Something went wrong. Try again.',
  },
  zh: {
    title: '天气仪表盘',
    placeholder: '输入城市名称...',
    searchBtn: '搜索',
    loading: '加载中...',
    emptyState: '搜索城市查看天气',
    forecastTitle: '五日预报',
    temperature: '温度',
    humidity: '湿度',
    apiHint: '免费获取 API Key：',
    enterCity: '请输入城市名称。',
    setApiKey: '请在 config.js 中设置 API Key。',
    cityNotFound: '未找到该城市。',
    forecastError: '无法加载预报数据。',
    unknownError: '出了点问题，请重试。',
  },
};

const conditionMap = {
  'clear sky': '晴天',
  'few clouds': '少云',
  'scattered clouds': '多云',
  'broken clouds': '多云',
  'overcast clouds': '阴天',
  'light rain': '小雨',
  'moderate rain': '中雨',
  'heavy rain': '大雨',
  'very heavy rain': '暴雨',
  'extreme rain': '暴雨',
  'freezing rain': '冻雨',
  'light intensity drizzle': '毛毛雨',
  'drizzle': '毛毛雨',
  'heavy intensity drizzle': '毛毛雨',
  'thunderstorm': '雷暴',
  'thunderstorm with light rain': '雷阵雨',
  'thunderstorm with rain': '雷阵雨',
  'thunderstorm with heavy rain': '雷暴大雨',
  'light snow': '小雪',
  'snow': '雪',
  'heavy snow': '大雪',
  'sleet': '雨夹雪',
  'mist': '薄雾',
  'haze': '霾',
  'fog': '雾',
  'sand': '沙尘',
  'dust': '扬尘',
  'smoke': '烟霾',
  'tornado': '龙卷风',
  'squall': '狂风',
};

let currentLang = 'en';

function t(key) {
  return translations[currentLang][key] || key;
}

function translateCondition(englishDesc) {
  if (currentLang === 'en') return englishDesc;
  return conditionMap[englishDesc.toLowerCase()] || englishDesc;
}

const LOCALE_MAP = { en: 'en-US', zh: 'zh-CN' };

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });

  const langToggle = document.getElementById('langToggle');
  langToggle.textContent = currentLang === 'en' ? '中文' : 'English';

  // Re-render current weather data if we have it cached
  if (lastCurrentData) renderCurrentWeather(lastCurrentData);
  if (lastForecastData) renderForecast(lastForecastData);
}

document.getElementById('langToggle').addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'zh' : 'en';
  applyLanguage();
});

// --- API & rendering ---
let lastCurrentData = null;
let lastForecastData = null;

const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const errorMsg = document.getElementById('errorMsg');
const emptyState = document.getElementById('emptyState');
const currentCard = document.getElementById('currentCard');
const forecastSection = document.getElementById('forecastSection');

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

searchBtn.addEventListener('click', async () => {
  const city = cityInput.value.trim();
  if (!city) {
    showError(t('enterCity'));
    return;
  }

  if (typeof API_KEY === 'undefined' || API_KEY === 'YOUR_API_KEY_HERE') {
    showError(t('setApiKey'));
    return;
  }

  hideError();
  searchBtn.disabled = true;
  searchBtn.textContent = t('loading');

  try {
    // Resolve city name to coordinates (supports Chinese & English)
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
    if (!geoRes.ok) throw new Error(t('cityNotFound'));
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error(t('cityNotFound'));

    const { lat, lon, local_names } = geoData[0];

    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`),
    ]);

    if (!currentRes.ok) throw new Error(t('cityNotFound'));
    if (!forecastRes.ok) throw new Error(t('forecastError'));

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    lastCurrentData = currentData;
    lastForecastData = forecastData;

    renderCurrentWeather(currentData);
    renderForecast(forecastData);

    emptyState.style.display = 'none';
  } catch (err) {
    showError(err.message || t('unknownError'));
    currentCard.classList.remove('visible');
    forecastSection.classList.remove('visible');
    emptyState.style.display = '';
    document.getElementById('cityName').textContent = '';
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = t('searchBtn');
  }
});

function renderCurrentWeather(data) {
  document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;

  const rawCondition = data.weather[0].description;
  document.getElementById('conditionText').textContent = translateCondition(rawCondition);

  document.getElementById('tempValue').innerHTML = `${Math.round(data.main.temp)}<span class="detail-unit">&deg;F</span>`;
  document.getElementById('humidityValue').innerHTML = `${data.main.humidity}<span class="detail-unit">%</span>`;

  const iconCode = data.weather[0].icon;
  document.getElementById('weatherIconLarge').src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  document.getElementById('weatherIconLarge').alt = translateCondition(rawCondition);

  currentCard.classList.add('visible');
}

function renderForecast(data) {
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

  const days = Object.keys(daily).slice(0, 5);

  const listEl = document.getElementById('forecastList');
  listEl.innerHTML = '';

  const locale = LOCALE_MAP[currentLang];

  days.forEach((dateStr) => {
    const d = daily[dateStr];
    const high = Math.round(Math.max(...d.highs));
    const low = Math.round(Math.min(...d.lows));
    const icon = d.icons[4] || d.icons[0];

    const date = new Date(dateStr + 'T12:00:00');
    const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
    const monthDay = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });

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
