<template>
  <button
    @click="themeStore.toggleTheme()"
    class="theme-toggle"
    :aria-label="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <svg-icon type="mdi" :path="themeStore.isDark ? mdiWeatherSunny : mdiWeatherNight" />
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
// @ts-expect-error - vue-icon types not available
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiWeatherSunny, mdiWeatherNight } from '@mdi/js'

const themeStore = useThemeStore()
</script>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--p-surface-0);
  border: 2px solid var(--p-surface-200);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.theme-toggle:hover {
  background: var(--p-primary-50);
  border-color: var(--p-primary-200);
  transform: scale(1.05);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.p-dark .theme-toggle {
  background: var(--p-surface-800);
  border-color: var(--p-surface-700);
}

.p-dark .theme-toggle:hover {
  background: var(--p-surface-700);
  border-color: var(--p-primary-400);
}

.theme-toggle svg {
  width: 1.5rem;
  height: 1.5rem;
  fill: var(--p-text-color);
  transition: fill 0.3s ease;
}
</style>
