<template>
  <div ref="gridRef" class="grid-stack"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, type Component } from 'vue'
import { createApp, h } from 'vue'
import { GridStack } from 'gridstack'
import type { GridStackWidget } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

export interface GridItem extends GridStackWidget {
  id: string
  component?: Component
  props?: Record<string, any>
  content?: string
}

interface Props {
  items?: GridItem[]
  options?: any
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  options: () => ({
    column: 24,
    cellHeight: 10,
    minRow: 1,
    float: false,
    animate: true,
    disableOneColumnMode: true,
    margin: 16,
    acceptWidgets: true,
  }),
})

const emit = defineEmits<{
  change: [items: any]
}>()

const gridRef = ref<HTMLElement | null>(null)
let grid: GridStack | null = null
const vueApps = new Map<string, any>()

// Clean up Vue apps
const cleanupVueApps = () => {
  vueApps.forEach((app) => {
    app.unmount()
  })
  vueApps.clear()
}

// Mount Vue component into grid item
const mountComponent = (el: HTMLElement, item: GridItem) => {
  if (item.component && item.props) {
    const app = createApp({
      render: () => h(item.component!, item.props || {}),
    })
    app.mount(el)
    vueApps.set(item.id, app)
  } else if (item.content) {
    el.innerHTML = item.content
  }
}

// Load items into grid
const loadItems = async () => {
  if (!grid || props.items.length === 0) return

  // Clear existing items
  grid.removeAll()
  cleanupVueApps()

  // Prepare items for GridStack
  const gridItems = props.items.map((item) => ({
    id: item.id,
    w: item.w || 4,
    h: item.h || 4,
    x: item.x,
    y: item.y,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH,
    noResize: item.noResize,
    noMove: item.noMove,
    locked: item.locked,
    content: '', // Will be populated after
  }))

  console.log(gridItems)

  // Load items into grid
  grid.load(gridItems)

  // Mount Vue components after grid items are created
  await nextTick()
  props.items.forEach((item) => {
    const gridItem = grid!.getGridItems().find((el) => el.getAttribute('gs-id') === item.id)
    if (gridItem) {
      const contentEl = gridItem.querySelector('.grid-stack-item-content') as HTMLElement
      if (contentEl) {
        mountComponent(contentEl, item)
      }
    }
  })
}

onMounted(async () => {
  await nextTick()

  if (gridRef.value) {
    // Initialize GridStack
    grid = GridStack.init(props.options, gridRef.value)

    // Listen to change events
    grid.on('change', () => {
      if (grid) {
        const items = grid.save(true) as any
        emit('change', items)
      }
    })

    // Load initial items
    await loadItems()
  }
})

onBeforeUnmount(() => {
  cleanupVueApps()
  if (grid) {
    grid.destroy(false)
    grid = null
  }
})

// Watch for items changes
watch(
  () => props.items,
  async () => {
    await loadItems()
  },
  { deep: true },
)

defineExpose({
  grid: () => grid,
  reload: loadItems,
})
</script>

<style>
/* GridStack base styles are imported from the library */
.grid-stack {
  background: transparent;
}

.grid-stack-item {
  cursor: move;
  cursor: grab;
}

.grid-stack-item.ui-draggable-dragging {
  cursor: grabbing !important;
  opacity: 0.8;
  z-index: 100;
}

.grid-stack-item-content {
  overflow: visible !important;
  border-radius: 0.75rem;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  padding: 0;
}

.p-dark .grid-stack-item-content {
  background: var(--p-surface-800);
  border-color: var(--p-surface-700);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.grid-stack-item-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--p-primary-300);
}

.p-dark .grid-stack-item-content:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: var(--p-primary-500);
}

/* Make sure cards in grid items take full space */
.grid-stack-item > .grid-stack-item-content > * {
  width: 100%;
  height: 100%;
}

/* Visual feedback for dragging */
.grid-stack-item.ui-draggable-dragging > .grid-stack-item-content {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25) !important;
  transform: scale(1.02);
}

/* Placeholder styling while dragging */
.grid-stack-placeholder > .placeholder-content {
  background: var(--p-primary-100) !important;
  border: 2px dashed var(--p-primary-400) !important;
  border-radius: 0.75rem !important;
}
</style>
