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
        bg-surface-0 dark:bg-surface-900
        text-surface-700 dark:text-surface-0
        shadow-md`,
  header: `card-header`,
  body: `p-5 flex flex-col gap-2`,
  caption: `flex flex-col gap-2`,
  title: `font-medium text-xl`,
  subtitle: `text-surface-500 dark:text-surface-400`,
  content: ``,
  footer: ``,
})
</script>
<style lang="scss">
.card-header {
  padding: 5px;

  .header-icon {
    background-color: rgba(255, 255, 255, 0.1);
    width: 40px;
    height: 40px;
    border-radius: 100%;
    svg path {
      align-content: center;
      justify-content: center;
      display: flex;
    }
  }

  .header-title {
    line-height: 28px;
  }
}
</style>
