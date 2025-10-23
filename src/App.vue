<template>
  <div class="flex">
    <Card v-for="room in rootStore.getDataByArea" :key="room" class="basis-1/3 m-2">
      <template #header>
        <h1>{{ fixRoomName(room[0].area_id) }}</h1>
      </template>
      <template #content>
        <div v-for="entity in room" :key="entity.id" class="flex flex-row content-center">
          <span style="line-height: 28px">
            {{ entity.name ?? entity.original_name }}
          </span>
          <div v-if="checkToggle(entity.entity_id)" class="">
            <span
              @click="updateState(rootStore.entities?.[entity.entity_id]?.state, entity.entity_id)"
              class="material-symbols-outlined"
              :style="getStyles(rootStore.entities?.[entity.entity_id]?.state, entity.entity_id)"
            >
              {{ getIcon(rootStore.entities?.[entity.entity_id]?.state, entity.entity_id) }}</span
            >
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRootStore } from './stores/root'
import Card from 'primevue/card'

const rootStore = useRootStore()

onMounted(async () => {
  if (!rootStore.entities) {
    await rootStore.loadData()
  }
})

const updateState = async (value: string, entityId: string) => {
  await rootStore.updateState(entityId, value)
}

const checkToggle = (entity_id: string) => {
  return rootStore.toggleEvents.some((prefix) => entity_id.startsWith(prefix))
}

const getStyles = (state: string | undefined, entityId: string) => {
  switch (entityId.split('.')[0]) {
    case 'light':
      if (state === 'on') return "color: #ffc824; font-variation-settings: 'FILL' 1, 'wght' 100; "
    case 'fan':
      if (state === 'on') return "color: #29b4df; font-variation-settings: 'FILL' 1, 'wght' 100; "
    case 'remote':
      if (state === 'on') return "color: #ff5722; font-variation-settings: 'FILL' 1, 'wght' 100; "
    case 'closed':
      return 'door_closed'
    default:
      return "color: #ffffff; font-variation-settings: 'FILL' 0, 'wght' 100; "
  }
}

const getIcon = (state: string | undefined, entityId: string) => {
  console.log(entityId.split('.')[0])
  switch (entityId.split('.')[0]) {
    case 'light':
      return state === 'on' ? 'lightbulb' : 'light_off'
    case 'fan':
      return state === 'on' ? 'mode_fan' : 'mode_fan_off'
    case 'remote':
      return state === 'on' ? 'tv' : 'tv_off'
    case 'closed':
      return 'door_closed'
    default:
      return 'help_outline'
  }
}

const fixRoomName = (name: string) => {
  return name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ')
}
</script>

<style>
.material-symbols-outlined {
  font-size: 30px;
  cursor: pointer;
  font-variation-settings:
    'FILL' 0,
    'wght' 100,
    'GRAD' 0,
    'opsz' 24;
}
</style>
