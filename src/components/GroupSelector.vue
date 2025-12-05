<template>
  <div class="group-selector">
    <label class="group-selector-label">Group by:</label>
    <Select
      v-model="selectedMode"
      :options="groupingOptions"
      option-label="label"
      option-value="value"
      placeholder="Select grouping"
      class="group-selector-dropdown"
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Select from 'primevue/select'
import type { GroupingMode } from '@/composables/useEntityGrouping'

interface GroupingOption {
  label: string
  value: GroupingMode
  icon?: string
}

const props = defineProps<{
  modelValue: GroupingMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: GroupingMode]
}>()

const selectedMode = ref<GroupingMode>(props.modelValue)

const groupingOptions: GroupingOption[] = [
  {
    label: 'Room',
    value: 'room',
  },
  {
    label: 'Entity Type',
    value: 'entity_type',
  },
  {
    label: 'Usage Frequency',
    value: 'frequency',
  },
  {
    label: 'No Grouping',
    value: 'none',
  },
]

watch(
  () => props.modelValue,
  (newValue) => {
    selectedMode.value = newValue
  }
)

watch(selectedMode, (newValue) => {
  emit('update:modelValue', newValue)
})

const handleChange = () => {
  emit('update:modelValue', selectedMode.value)
}
</script>

<style scoped>
.group-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--p-surface-0);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.p-dark .group-selector {
  background: var(--p-surface-800);
}

.group-selector-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  white-space: nowrap;
}

.group-selector-dropdown {
  min-width: 200px;
}
</style>
