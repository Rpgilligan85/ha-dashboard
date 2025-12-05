import { ref, computed, type ComputedRef } from 'vue'
import type { GridItem } from '@/components/GridStackLayout.vue'

const STORAGE_KEY = 'dashboard-layout'

interface SavedLayoutItem {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export function useDashboardLayout(defaultItems: ComputedRef<GridItem[]>) {
  const savedLayout = ref<SavedLayoutItem[]>([])

  // Load layout from localStorage
  const loadLayout = (): void => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        savedLayout.value = JSON.parse(saved)
        console.log('Loaded layout from localStorage:', savedLayout.value)
      } else {
        console.log('No saved layout found, using default layout')
      }
    } catch (error) {
      console.error('Failed to load layout from localStorage:', error)
      savedLayout.value = []
    }
  }

  // Save layout to localStorage
  const saveLayout = (items: SavedLayoutItem[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      savedLayout.value = items
      console.log('Saved layout to localStorage:', items)
    } catch (error) {
      console.error('Failed to save layout to localStorage:', error)
    }
  }

  // Merge saved layout with default items
  // This ensures new entities are added and removed entities are filtered out
  const mergedItems = computed<GridItem[]>(() => {
    if (savedLayout.value.length === 0) {
      return defaultItems.value
    }

    // Create a map of saved positions by id
    const savedPositions = new Map(
      savedLayout.value.map(item => [item.id, item])
    )

    // Merge: use saved positions if available, otherwise use default
    return defaultItems.value.map(defaultItem => {
      const savedItem = savedPositions.get(defaultItem.id)
      if (savedItem) {
        // Use saved position and size, but keep component and props from default
        return {
          ...defaultItem,
          x: savedItem.x,
          y: savedItem.y,
          w: savedItem.w,
          h: savedItem.h,
        }
      }
      // New item not in saved layout, use default
      return defaultItem
    })
  })

  // Handle layout changes from GridStack
  const handleLayoutChange = (items: SavedLayoutItem[]): void => {
    saveLayout(items)
  }

  return {
    loadLayout,
    saveLayout,
    handleLayoutChange,
    mergedItems,
  }
}
