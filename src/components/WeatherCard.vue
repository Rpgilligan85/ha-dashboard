<template>
  <Card class="weather-card">
    <template #content>
      <div class="weather-content">
        <div class="weather-icon-container">
          <img :src="getWeatherIcon(weatherState)" :alt="weatherState" class="weather-icon" />
        </div>
        <div class="weather-info">
          <div class="location">{{ entityName }}</div>
          <div class="temperature">{{ temperature }}{{ temperatureUnit }}</div>
          <div class="condition">{{ formatCondition(weatherState) }}</div>
          <div class="weather-details">
            <div class="detail-item">
              <span class="detail-label">Humidity:</span>
              <span class="detail-value">{{ humidity }}%</span>
            </div>
            <div class="detail-item" v-if="windSpeed">
              <span class="detail-label">Wind:</span>
              <span class="detail-value">{{ windSpeed }} {{ windSpeedUnit }}</span>
            </div>
            <div class="detail-item" v-if="pressure">
              <span class="detail-label">Pressure:</span>
              <span class="detail-value">{{ pressure }} {{ pressureUnit }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRootStore } from '@/stores/root'
import type { HAWeatherEntity } from '@/types/homeassistant'
import Card from '@/volt/Card.vue'

const rootStore = useRootStore()
const props = defineProps<{
  entityId: string
}>()

const weatherData = computed(() => {
  return rootStore.entities?.[props.entityId] as HAWeatherEntity | undefined
})

const entityName = computed(() => {
  return weatherData.value?.attributes?.friendly_name || 'Weather'
})

const weatherState = computed(() => weatherData.value?.state || 'unknown')
const temperature = computed(() => weatherData.value?.attributes?.temperature || '--')
const temperatureUnit = computed(() => weatherData.value?.attributes?.temperature_unit || '°F')
const humidity = computed(() => weatherData.value?.attributes?.humidity || '--')
const windSpeed = computed(() => weatherData.value?.attributes?.wind_speed)
const windSpeedUnit = computed(() => weatherData.value?.attributes?.wind_speed_unit || 'mph')
const pressure = computed(() => weatherData.value?.attributes?.pressure)
const pressureUnit = computed(() => weatherData.value?.attributes?.pressure_unit || 'inHg')

// Determine if it's day or night based on current time
// You could also use Home Assistant sun entity for more accuracy
const isNightTime = () => {
  const hour = new Date().getHours()
  return hour < 6 || hour >= 18
}

const getWeatherIcon = (condition: string): string => {
  const isNight = isNightTime()
  const conditionLower = condition.toLowerCase()

  // Map Home Assistant weather conditions to icon files
  const iconMap: Record<string, string> = {
    // Clear conditions
    'clear-night': 'clear_night.svg',
    'sunny': 'clear_day.svg',
    'clear': isNight ? 'clear_night.svg' : 'clear_day.svg',

    // Cloudy conditions
    'partlycloudy': isNight ? 'partly_cloudy_night.svg' : 'partly_cloudy_day.svg',
    'cloudy': 'cloudy.svg',
    'mostlycloudy': isNight ? 'mostly_cloudy_night.svg' : 'mostly_cloudy_day.svg',
    'mostlyclear': isNight ? 'mostly_clear_night.svg' : 'mostly_clear_day.svg',

    // Rainy conditions
    'rainy': 'showers_rain.svg',
    'pouring': 'heavy_rain.svg',
    'drizzle': 'drizzle.svg',
    'rain': 'showers_rain.svg',
    'showers': isNight ? 'scattered_showers_night.svg' : 'scattered_showers_day.svg',

    // Snowy conditions
    'snowy': 'showers_snow.svg',
    'snow': 'showers_snow.svg',
    'heavysnow': 'heavy_snow.svg',
    'snowflurries': 'flurries.svg',
    'blizzard': 'blizzard.svg',
    'blowingsnow': 'blowing_snow.svg',

    // Mixed precipitation
    'sleet': 'sleet_hail.svg',
    'hail': 'sleet_hail.svg',
    'mixedrain': 'mixed_rain_hail_sleet.svg',
    'snowyrainy': 'mixed_rain_snow.svg',

    // Thunderstorms
    'lightning': 'isolated_thunderstorms.svg',
    'lightning-rainy': 'strong_thunderstorms.svg',
    'thunderstorm': isNight ? 'isolated_scattered_thunderstorms_night.svg' : 'isolated_scattered_thunderstorms_day.svg',

    // Special conditions
    'fog': 'haze_fog_dust_smoke.svg',
    'hazy': 'haze_fog_dust_smoke.svg',
    'windy': 'windy.svg',
    'windyvariant': 'windy.svg',
    'tornado': 'tornado.svg',
    'hurricane': 'tropical_storm_hurricane.svg',
    'icy': 'icy.svg',
    'exceptional': 'tornado.svg',
  }

  // Remove hyphens and spaces for matching
  const normalizedCondition = conditionLower.replace(/[-_\s]/g, '')

  return `/src/assets/weather-icons/${iconMap[normalizedCondition] || iconMap[conditionLower] || 'cloudy.svg'}`
}

const formatCondition = (condition: string): string => {
  return condition
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>

<style scoped>
.weather-card {
  background: linear-gradient(135deg, var(--p-primary-500) 0%, var(--p-primary-700) 100%);
  color: white;
  border: 1px solid var(--p-primary-600);
  min-width: 300px;
  max-width: 100%;
}

.p-dark .weather-card {
  background: linear-gradient(135deg, var(--p-primary-600) 0%, var(--p-primary-800) 100%);
  border-color: var(--p-primary-700);
}

.weather-content {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  padding: 1.5rem;
}

.weather-icon-container {
  flex-shrink: 0;
}

.weather-icon {
  width: 100px;
  height: 100px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
}

.weather-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.location {
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.temperature {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.condition {
  font-size: 1.25rem;
  font-weight: 500;
  opacity: 0.95;
  text-transform: capitalize;
}

.weather-details {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.75rem;
  opacity: 0.85;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: 1rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .weather-card {
    min-width: auto;
  }

  .weather-content {
    flex-direction: column;
    text-align: center;
    padding: 1.25rem;
  }

  .weather-icon {
    width: 80px;
    height: 80px;
  }

  .temperature {
    font-size: 2.5rem;
  }

  .weather-details {
    justify-content: center;
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .weather-card {
    min-width: 400px;
  }

  .weather-content {
    padding: 2rem;
  }
}
</style>
