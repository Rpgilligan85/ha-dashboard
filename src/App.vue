<template>
  <div class="app-container">
    <ThemeToggle />

    <div class="app-content">
      <!-- Grouping Selector -->
      <GroupSelector v-model="groupingMode" @update:model-value="handleGroupingChange" />

      <!-- GridStack Layout -->
      <GridStackLayout :items="gridItems" @change="handleLayoutChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, h } from 'vue'
import { useRootStore } from './stores/root'
import { useThemeStore } from './stores/theme'
import { useEntityGrouping } from './composables/useEntityGrouping'
import { useDashboardLayout } from './composables/useDashboardLayout'
import type { GridItem } from './components/GridStackLayout.vue'
import DynamicEntity from './components/DynamicEntity.vue'
import WeatherCard from './components/WeatherCard.vue'
import NestThermostat from './components/NestThermostat.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import GroupSelector from './components/GroupSelector.vue'
import GridStackLayout from './components/GridStackLayout.vue'

const rootStore = useRootStore()
const themeStore = useThemeStore()
const { groupingMode, currentGroups, setGroupingMode } = useEntityGrouping()

onMounted(async () => {
  themeStore.initTheme()
  if (!rootStore.entities) {
    await rootStore.loadData()
  }
  // Load saved layout from localStorage
  loadLayout()
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

// Create Entity Group Component wrapper
const EntityGroup = (props: { groupName: string; entities: any[] }) => {
  return h('div', { class: 'entity-group' }, [
    h('h2', { class: 'group-title' }, props.groupName),
    h(
      'div',
      { class: 'entities-container' },
      props.entities.map((entity) =>
        h(DynamicEntity, { entityId: entity.entity_id, key: entity.entity_id })
      )
    ),
  ])
}

// Build default grid items from entities
const defaultGridItems = computed<GridItem[]>(() => {
  const items: GridItem[] = []
  let currentY = 0

  // Add weather cards
  weatherEntities.value.forEach((entityId, index) => {
    items.push({
      id: `weather-${entityId}`,
      component: WeatherCard,
      props: { entityId },
      w: 8,
      h: 24,
      x: 0,
      y: currentY,
    })
    currentY += 8
  })

  // Add climate cards
  currentY = 0
  climateEntities.value.forEach((entityId, index) => {
    items.push({
      id: `climate-${entityId}`,
      component: NestThermostat,
      props: { entityId },
      w: 6,
      h: 50,
      x: 0,
      y: currentY,

    })
    currentY += 12
  })

  // Add entity groups based on current grouping mode
  currentY = 0
  currentGroups.value.forEach((group, index) => {

    const entityCount = group.entities.length

    items.push({
      id: group.id,
      component: EntityGroup,
      props: { groupName: group.name, entities: group.entities },
      w: 6,
      h: entityCount * 12,
      x: 12,
      y: currentY,

    })
    currentY += entityCount * 4
  })
  console.log('Default items:', items)

  return items
})

// Use layout composable to manage persistence
const { loadLayout, handleLayoutChange: saveLayoutChange, mergedItems } = useDashboardLayout(defaultGridItems)

// Final grid items with saved layout applied
const gridItems = computed(() => mergedItems.value)

const handleLayoutChange = (items: any) => {
  // Save layout configuration to localStorage via composable
  console.log('Layout changed:', items)
  saveLayoutChange(items)
}

const handleGroupingChange = (mode: any) => {
  setGroupingMode(mode)
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
}

/* GridStack container styling */
:deep(.grid-stack) {
  background: transparent;
  min-height: 100vh;
}

:deep(.grid-stack-item) {
  transition: all 0.3s ease;
}


/* Ensure cards fill their containers */entity-group


/* Entity Groups */
.entity-group {
  background: transparent;
  /* padding: 1.5rem; */
  border: none;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: none;
  overflow-y: auto;
}

.p-dark .entity-group {
  background: transparent;
}

.group-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--p-surface-200);
  flex-shrink: 0;
}

.p-dark .group-title {
  border-bottom-color: var(--p-surface-700);
}

.entities-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  overflow-y: auto;
}

</style>
