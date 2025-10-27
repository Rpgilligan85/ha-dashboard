<template>
  <Card
    class="entity-card"
    :class="{ 'entity-active': isActive }"
    @click="handleClick"
  >
    <template #content>
      <div class="entity-content">
        <div class="entity-icon-wrapper" :class="{ 'entity-icon-active': isActive }">
          <svg style="position: absolute; width: 0; height: 0">
            <defs>
              <linearGradient id="led-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color: #ff0080" />
                <stop offset="100%" style="stop-color: #7928ca" />
              </linearGradient>
            </defs>
          </svg>
          <svg-icon
            type="mdi"
            :path="getIcon(entityState, props.entity.entity_id)"
            class="entity-icon"
            :class="getIconClass(entityState, props.entity.entity_id)"
          />
        </div>
        <div class="entity-info">
          <div class="entity-name">
            {{ props.entity.name ?? props.entity.original_name ?? props.entity.device_name }}
          </div>
          <div class="entity-state">
            {{ formatState(entityState) }}
          </div>
        </div>
        <div v-if="isToggleable" class="entity-toggle-indicator">
          <div class="toggle-dot" :class="{ 'toggle-dot-active': isActive }"></div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRootStore } from '@/stores/root'
import Card from '@/volt/Card.vue'
// @ts-expect-error - vue-icon types not available
import SvgIcon from '@jamescoyle/vue-icon'
import {
  mdiLedStripVariant,
  mdiCeilingFanLight,
  mdiFan,
  mdiFanOff,
  mdiTelevision,
  mdiTelevisionOff,
  mdiPowerSocketUs,
  mdiLightbulbOutline,
  mdiLightbulb,
} from '@mdi/js'

import type { EntityWithRegistry } from '@/types/homeassistant'

const rootStore = useRootStore()
const props = defineProps<{
  entity: EntityWithRegistry
}>()

const entityState = computed(() => {
  return rootStore.entities?.[props.entity.entity_id]?.state
})

const isActive = computed(() => entityState.value === 'on')

const isToggleable = computed(() => {
  return rootStore.toggleEvents.some((prefix) => props.entity.entity_id.startsWith(prefix))
})

const handleClick = async () => {
  if (isToggleable.value) {
    await rootStore.updateState(props.entity.entity_id, entityState.value)
  }
}

const formatState = (state: string | undefined): string => {
  if (!state) return 'Unknown'
  return state.charAt(0).toUpperCase() + state.slice(1)
}

const getIconClass = (state: string | undefined, entityId: string): string => {
  const domain = entityId.split('.')[0]

  if (domain === 'light' && entityId === 'light.sony_led') {
    return state === 'on' ? 'icon-gradient' : ''
  }

  return ''
}

const getIcon = (state: string | undefined, entityId: string): string => {
  const domain = entityId.split('.')[0]

  switch (domain) {
    case 'light':
      if (entityId === 'light.sony_led') {
        return mdiLedStripVariant
      }
      return state === 'on' ? mdiLightbulb : mdiLightbulbOutline

    case 'fan':
      return state === 'on' ? mdiFan : mdiFanOff

    case 'remote':
      return state === 'on' ? mdiTelevision : mdiTelevisionOff

    case 'switch':
      return mdiPowerSocketUs

    default:
      return mdiLightbulbOutline
  }
}
</script>

<style scoped>
.entity-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
}

.p-dark .entity-card {
  background: var(--p-surface-800);
  border-color: var(--p-surface-700);
}

.entity-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-color: var(--p-primary-300);
}

.p-dark .entity-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  border-color: var(--p-primary-500);
}

.entity-card.entity-active {
  background: linear-gradient(135deg, var(--p-primary-500) 0%, var(--p-primary-700) 100%);
  border-color: var(--p-primary-600);
  color: white;
}

.p-dark .entity-card.entity-active {
  background: linear-gradient(135deg, var(--p-primary-600) 0%, var(--p-primary-800) 100%);
}

.entity-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
}

.entity-icon-wrapper {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-100);
  transition: all 0.3s ease;
}

.p-dark .entity-icon-wrapper {
  background: var(--p-surface-700);
}

.entity-icon-wrapper.entity-icon-active {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.entity-icon {
  width: 1.75rem;
  height: 1.75rem;
  fill: var(--p-text-color);
  transition: fill 0.3s ease;
}

.entity-active .entity-icon {
  fill: white;
}

.entity-icon.icon-gradient {
  fill: url(#led-gradient);
}

.entity-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.entity-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-active .entity-name {
  color: white;
}

.entity-state {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: capitalize;
}

.entity-active .entity-state {
  color: rgba(255, 255, 255, 0.8);
}

.entity-toggle-indicator {
  flex-shrink: 0;
  width: 2.5rem;
  height: 1.5rem;
  border-radius: 0.75rem;
  background: var(--p-surface-300);
  position: relative;
  transition: background 0.3s ease;
}

.p-dark .entity-toggle-indicator {
  background: var(--p-surface-600);
}

.entity-active .entity-toggle-indicator {
  background: rgba(255, 255, 255, 0.3);
}

.toggle-dot {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-dot-active {
  transform: translateX(1rem);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.4);
}

@media (max-width: 640px) {
  .entity-content {
    padding: 0.75rem;
  }

  .entity-icon-wrapper {
    width: 2.5rem;
    height: 2.5rem;
  }

  .entity-icon {
    width: 1.5rem;
    height: 1.5rem;
  }
}
</style>
