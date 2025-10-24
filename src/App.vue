<template>
  <div class="app-container">
    <ThemeToggle />

    <div class="app-content">
      <!-- Weather and Climate Section -->
      <section v-if="weatherEntities.length > 0 || climateEntities.length > 0" class="top-section">
        <!-- Weather -->
        <div v-if="weatherEntities.length > 0" class="weather-container">
          <h1 class="section-title">Weather</h1>
          <div class="weather-grid">
            <template v-for="entityId in weatherEntities" :key="entityId">
              <WeatherCard :entity-id="entityId" />
            </template>
          </div>
        </div>

        <!-- Climate/Thermostats -->
        <div v-if="climateEntities.length > 0" class="climate-container">
          <h1 class="section-title">Climate</h1>
          <div class="climate-grid">
            <template v-for="entityId in climateEntities" :key="entityId">
              <NestThermostat :entity-id="entityId" />
            </template>
          </div>
        </div>
      </section>

      <!-- Rooms Section -->
      <section class="rooms-section">
        <div v-for="(entities, room) in roomEntities" :key="room" class="room-group">
          <h2 class="room-title">{{ fixRoomName(room) }}</h2>
          <div class="entities-grid">
            <template v-for="entity in entities" :key="entity.entity_id">
              <EntityCard :entity="entity" />
            </template>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRootStore } from './stores/root'
import { useThemeStore } from './stores/theme'
import EntityCard from './components/EntityCard.vue'
import WeatherCard from './components/WeatherCard.vue'
import NestThermostat from './components/NestThermostat.vue'
import ThemeToggle from './components/ThemeToggle.vue'

const rootStore = useRootStore()
const themeStore = useThemeStore()

onMounted(async () => {
  themeStore.initTheme()
  if (!rootStore.entities) {
    await rootStore.loadData()
  }
})

// Get weather entities directly from entities store
const weatherEntities = computed(() => {
  if (!rootStore.entities) return []
  return Object.keys(rootStore.entities).filter((entityId) => entityId.startsWith('weather.'))
})

// Get climate entities directly from entities store
const climateEntities = computed(() => {
  if (!rootStore.entities) return []
  return Object.keys(rootStore.entities).filter((entityId) => entityId.startsWith('climate.'))
})

// Room entities remain the same (from finalData)
const roomEntities = computed(() => {
  return rootStore.getDataByArea
})

const fixRoomName = (name: string) => {
  return name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ')
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: var(--p-surface-50);
  transition: background-color 0.3s ease;
}

.p-dark .app-container {
  background: var(--p-surface-900);
}

.app-content {
  max-width: 1920px;
  margin: 0 auto;
  padding: 1rem;
}

/* Top Section (Weather + Climate) */
.top-section {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.weather-container,
.climate-container {
  width: 100%;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--p-text-color);
  margin-bottom: 1.5rem;
  padding: 0 0.5rem;
}

.weather-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.climate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

/* Rooms Section */
.rooms-section {
  display: grid;
  gap: 2rem;
}

.room-group {
  background: var(--p-surface-0);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.p-dark .room-group {
  background: var(--p-surface-800);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.room-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--p-surface-200);
}

.p-dark .room-title {
  border-bottom-color: var(--p-surface-700);
}

.entities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

/* Responsive Design */
@media (max-width: 640px) {
  .app-content {
    padding: 0.75rem;
  }

  .section-title {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .weather-grid,
  .climate-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .room-group {
    padding: 1rem;
    border-radius: 0.75rem;
  }

  .room-title {
    font-size: 1.25rem;
  }

  .entities-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .rooms-section {
    gap: 1rem;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .app-content {
    padding: 1.5rem;
  }

  .weather-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  .climate-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }

  .entities-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .top-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
  }
}

@media (min-width: 1025px) {
  .app-content {
    padding: 2rem;
  }

  .rooms-section {
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  }

  .weather-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 2rem;
  }

  .climate-grid {
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 2rem;
  }

  .top-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
  }
}

@media (min-width: 1440px) {
  .rooms-section {
    grid-template-columns: repeat(2, 1fr);
  }

  .top-section {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
