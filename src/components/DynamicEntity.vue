<template>
  <component :is="entityComponent" :entity-id="entityId" />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import LightEntity from './entities/LightEntity.vue'
import FanEntity from './entities/FanEntity.vue'
import SwitchEntity from './entities/SwitchEntity.vue'
import RemoteEntity from './entities/RemoteEntity.vue'
import EntityCard from './EntityCard.vue' // Fallback for unknown types

const props = defineProps<{
  entityId: string
}>()

// Map entity domains to components
const entityComponentMap: Record<string, Component> = {
  light: LightEntity,
  fan: FanEntity,
  switch: SwitchEntity,
  remote: RemoteEntity,
}

// Get entity domain
const entityDomain = computed(() => {
  return props.entityId.split('.')[0]
})

// Select appropriate component
const entityComponent = computed(() => {
  const domain = entityDomain.value
  return domain ? entityComponentMap[domain] || EntityCard : EntityCard
})
</script>
