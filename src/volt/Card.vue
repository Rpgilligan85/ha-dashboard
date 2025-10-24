<template>
  <Card
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card, { type CardPassThroughOptions, type CardProps } from 'primevue/card'
import { ref } from 'vue'
import { ptViewMerge } from './utils'

interface Props extends /* @vue-ignore */ CardProps {}
defineProps<Props>()

const theme = ref<CardPassThroughOptions>({
  root: `flex flex-col rounded-xl
        overflow-hidden
        transition-all duration-300
        shadow-sm hover:shadow-md`,
  header: ``,
  body: `p-0`,
  caption: `flex flex-col gap-2`,
  title: `font-medium text-xl`,
  subtitle: `text-surface-500 dark:text-surface-400`,
  content: ``,
  footer: ``,
})
</script>
<style scoped>
/* Card styles are now handled by component-specific CSS */
</style>
