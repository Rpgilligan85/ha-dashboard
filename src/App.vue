<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRootStore } from './stores/root'
import Card from 'primevue/card'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'

const rootStore = useRootStore()
const devices = ref()

onMounted(async () => {
  await rootStore.connect()
  devices.value = await rootStore.getAllDevices()
  console.log('getAllDevices', devices.value)
})

const getEntity = (entityId: string) => {
  console.log('getEntity', rootStore.entities?.[entityId])
  return rootStore.entities?.[entityId]
}

const getEntityState = (entityId: string) => {
  return rootStore.entities?.[entityId]?.state === 'on'
}

const updateState = async (value: boolean, entityId: string) => {
  console.log('updateState', value, entityId)
  await rootStore.updateState(entityId, value)
}

const checkToggle = (entity_id: string) => {
  console.log('checkToggle', entity_id, rootStore.toggleEvents)
  return rootStore.toggleEvents.some((prefix) => entity_id.startsWith(prefix))
}
</script>

<template>
  <div class="grid m-4">
    <Card v-for="room in devices" :key="room.id" class="p-3 flex">
      <template #header>
        {{ room[0].area_id }}
      </template>
      <template #content>
        <div v-for="device in room" :key="device.id">
          <div v-for="entity in device.entities" :key="entity.id">
            <span>
              {{ entity.name ?? entity.original_name }}
            </span>
            <div v-if="checkToggle(entity.entity_id)" class="card flex justify-center">
              <ToggleSwitch
                :model-value="getEntityState(entity.entity_id)"
                @update:model-value="updateState($event, entity.entity_id)"
              />
              {{ getEntity(entity.entity_id)?.state }}
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
