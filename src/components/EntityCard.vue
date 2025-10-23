<template>
  <Card
    :style="{
      backgroundColor: entityState === 'on' ? 'var(--p-primary-900)' : 'var(--p-surface-500)',
    }"
    @click="updateState(props.entity.entity_id, entityState)"
  >
    <template #content>
      <div class="flex items-center">
        <div
          class="mdi-icons card-icon flex justify-center content-center"
          :class="getClass(entityState, props.entity.entity_id)"
        >
          <svg style="position: absolute; width: 0; height: 0">
            <defs>
              <linearGradient id="my-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color: #ff0080" />
                <stop offset="100%" style="stop-color: #7928ca" />
              </linearGradient>
            </defs>
          </svg>
          <svg-icon type="mdi" :path="getIcon(entityState, props.entity.entity_id)"></svg-icon>
        </div>
        <span class="card-title">
          {{ props.entity.name ?? props.entity.original_name }}
        </span>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRootStore } from '@/stores/root'
import Card from '@/volt/Card.vue'
// @ts-ignore
import SvgIcon from '@jamescoyle/vue-icon'
import {
  mdiLedStripVariant,
  mdiCeilingFanLight,
  mdiFan,
  mdiFanOff,
  mdiTelevision,
  mdiTelevisionOff,
} from '@mdi/js'

const rootStore = useRootStore()
const props = defineProps<{
  entity: {
    entity_id: string
    name?: string
    original_name: string
  }
}>()

const entityState = computed(() => {
  return rootStore.entities?.[props.entity.entity_id]?.state
})

const updateState = async (entityId: string, value: string | undefined) => {
  await rootStore.updateState(entityId, value)
}

const checkToggle = (entity_id: string) => {
  return rootStore.toggleEvents.some((prefix) => entity_id.startsWith(prefix))
}

const getClass = (state: string | undefined, entityId: string) => {
  switch (entityId.split('.')[0]) {
    case 'light':
      if (entityId === 'light.sony_led') {
        return state === 'on' ? 'gradient-icon' : ''
      } else {
        return state === 'on' ? 'light-on' : ''
      }
    case 'fan':
      return state === 'on' ? 'fan-on' : ''
    case 'remote':
      return state === 'on' ? 'remote-on' : ''
    case 'closed':
      return 'door_closed'
    default:
      return 'color: #ffffff; '
  }
}

const getIcon = (state: string | undefined, entityId: string) => {
  switch (entityId.split('.')[0]) {
    case 'light':
      if (entityId === 'light.sony_led') {
        return mdiLedStripVariant
      } else {
        return mdiCeilingFanLight
      }
    case 'fan':
      return state === 'on' ? mdiFan : mdiFanOff
    case 'remote':
      return state === 'on' ? mdiTelevision : mdiTelevisionOff
    case 'closed':
      return 'door_closed'
    default:
      return 'help_outline'
  }
}
</script>

<style>
.mdi-icons {
  font-size: 30px;
  cursor: pointer;
}

.gradient-icon svg path {
  fill: url(#my-gradient);
}

.light-on svg path {
  fill: #ffea00;
}
.fan-on svg path {
  fill: #29b4df;
}
.remote-on svg path {
  fill: #ff5722;
}
</style>
