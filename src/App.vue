<script setup lang="ts">
import { onMounted } from 'vue'

import { useRootStore } from './stores/root'
const rootStore = useRootStore()

onMounted(async () => {
  await rootStore.connect()
})
</script>

<template>
  <h1>You did it!</h1>
  <div v-if="rootStore.entities">
    {{ rootStore.entities['light.sony_led']?.state }}
  </div>
</template>

<style scoped></style>
