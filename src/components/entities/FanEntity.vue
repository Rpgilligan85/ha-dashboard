<template>
  <div
    class="entity-fan"
    :class="{ 'entity-active': isActive }"
    @click="handleClick"
  >
    <div class="entity-icon-wrapper" :class="{ 'entity-icon-active': isActive }">
      <svg-icon
        type="mdi"
        :path="isActive ? mdiFan : mdiFanOff"
        class="entity-icon"
        :class="{ 'spinning': isActive }"
      />
    </div>
    <div class="entity-info">
      <div class="entity-name">{{ entityName }}</div>
      <div class="entity-state">{{ formatState(entityState) }}</div>
    </div>
    <div v-if="isToggleable" class="entity-toggle">
      <div class="toggle-dot" :class="{ 'toggle-dot-active': isActive }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRootStore } from '@/stores/root'
// @ts-expect-error - vue-icon types not available
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiFan, mdiFanOff } from '@mdi/js'

const props = defineProps<{
  entityId: string
}>()

const rootStore = useRootStore()

const entity = computed(() => rootStore.entities?.[props.entityId])
const entityState = computed(() => entity.value?.state)
const entityName = computed(() => (entity.value as any)?.attributes?.friendly_name || props.entityId)
const isActive = computed(() => entityState.value === 'on')
const isToggleable = computed(() => true)

const handleClick = async () => {
  if (isToggleable.value) {
    await rootStore.updateState(props.entityId, entityState.value)
  }
}

const formatState = (state: string | undefined): string => {
  if (!state) return 'Unknown'
  return state.charAt(0).toUpperCase() + state.slice(1)
}
</script>

<style scoped>
.entity-fan {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.p-dark .entity-fan {
  background: var(--p-surface-700);
  border-color: var(--p-surface-600);
}

.entity-fan:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--p-primary-300);
}

.entity-fan.entity-active {
  background: linear-gradient(135deg, var(--p-primary-500) 0%, var(--p-primary-700) 100%);
  border-color: var(--p-primary-600);
  color: white;
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
}

.entity-icon {
  width: 1.75rem;
  height: 1.75rem;
  fill: var(--p-text-color);
  transition: fill 0.3s ease;
}

.entity-icon.spinning {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.entity-active .entity-icon {
  fill: white;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-state {
  font-size: 0.75rem;
  opacity: 0.7;
}

.entity-toggle {
  flex-shrink: 0;
  width: 2.5rem;
  height: 1.5rem;
  border-radius: 0.75rem;
  background: var(--p-surface-300);
  position: relative;
}

.entity-active .entity-toggle {
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
}
</style>
