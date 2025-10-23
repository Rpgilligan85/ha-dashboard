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
        bg-surface-0
        text-surface-700 dark:text-surface-0
        shadow-md my-3 cursor-pointer`,
  header: ``,
  body: ``,
  caption: `flex flex-col gap-2`,
  title: `font-medium text-xl`,
  subtitle: `text-surface-500 dark:text-surface-400`,
  content: `card-content`,
  footer: ``,
})
</script>
<style lang="scss">
.card-content {
  padding: 7px;

  .card-icon {
    background-color: rgba(255, 255, 255, 0.1);
    width: 40px;
    height: 40px;
    border-radius: 100%;
    margin-right: 10px;
    svg {
      align-self: center;
      justify-content: center;
      display: flex;
    }
  }

  .card-title {
    line-height: 28px;
  }
}
</style>
