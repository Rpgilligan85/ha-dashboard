<template>
  <div class="app-container">
    <ThemeToggle />

    <div class="app-content">
      <!-- Main Grid Layout -->
      <div class="main-grid">
        <!-- Weather Cards -->
        <template v-for="entityId in weatherEntities" :key="`weather-${entityId}`">
          <WeatherCard :entity-id="entityId" />
        </template>

        <!-- Climate/Thermostats -->
        <template v-for="entityId in climateEntities" :key="`climate-${entityId}`">
          <NestThermostat :entity-id="entityId" />
        </template>

        <!-- Room Groups -->
        <template v-for="(entities, room) in roomEntities" :key="`room-${room}`">
          <div class="room-group">
            <h2 class="room-title">{{ fixRoomName(room) }}</h2>
            <div class="entities-grid">
              <template v-for="entity in entities" :key="entity.entity_id">
                <EntityCard :entity="entity" />
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRootStore } from './stores/root'
import { useThemeStore } from './stores/theme'
import EntityCard from './components/EntityCard.vue'
import WeatherCard from './components/WeatherCard.vue'
// import NestThermostat2 from './components/NestThermostat2.vue'
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
  padding: 1.5rem;
}

/* Main Grid - Masonry-style layout */
.main-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  align-items: start;
}

/* Room Groups */
.room-group {
  background: var(--p-surface-0);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  min-height: min-content;
}

.p-dark .room-group {
  background: var(--p-surface-800);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.room-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 1rem 0;
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

  .main-grid {
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
}

@media (min-width: 641px) and (max-width: 1024px) {
  .app-content {
    padding: 1.25rem;
  }

  .main-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.25rem;
  }

  .entities-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (min-width: 1025px) and (max-width: 1439px) {
  .app-content {
    padding: 1.5rem;
  }

  .main-grid {
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  }
}

@media (min-width: 1440px) {
  .app-content {
    padding: 2rem;
  }

  .main-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1920px) {
  .main-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }
}
</style>
