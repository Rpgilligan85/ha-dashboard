<template>
  <div class="flex p-dark">
    <div v-for="(entites, room) in rootStore.getDataByArea" :key="room" class="basis-1/3 m-2">
      <h1>{{ fixRoomName(room) }}</h1>
      <template v-for="entity in entites">
        <EntityCard :entity="entity" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRootStore } from './stores/root'
import EntityCard from './components/EntityCard.vue'
const rootStore = useRootStore()

onMounted(async () => {
  if (!rootStore.entities) {
    await rootStore.loadData()
  }
})

const fixRoomName = (name: string) => {
  return name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ')
}
</script>
