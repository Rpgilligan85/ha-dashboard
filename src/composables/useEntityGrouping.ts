import { ref, computed } from 'vue'
import { useRootStore } from '@/stores/root'
import { groupBy } from 'lodash'
import type { EntityWithRegistry } from '@/types/homeassistant'

export type GroupingMode = 'room' | 'entity_type' | 'frequency' | 'none'

export interface EntityGroup {
  id: string
  name: string
  entities: EntityWithRegistry[]
}

export function useEntityGrouping() {
  const rootStore = useRootStore()
  const groupingMode = ref<GroupingMode>('room')

  // Get entity domain (light, fan, switch, etc.)
  const getEntityDomain = (entityId: string): string => {
    return entityId.split('.')[0] || 'unknown'
  }

  // Format group name
  const formatGroupName = (name: string): string => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')
  }

  // Get all control entities (lights, fans, switches, etc.)
  const allEntities = computed(() => {
    return rootStore.getDataByArea ? Object.values(rootStore.getDataByArea).flat() : []
  })

  // Group by room/area
  const groupByRoom = computed<EntityGroup[]>(() => {
    const grouped = rootStore.getDataByArea
    return Object.entries(grouped).map(([areaId, entities]) => ({
      id: `room-${areaId}`,
      name: formatGroupName(areaId),
      entities: entities as EntityWithRegistry[],
    }))
  })

  // Group by entity type (domain)
  const groupByEntityType = computed<EntityGroup[]>(() => {
    const grouped = groupBy(allEntities.value, (entity) => getEntityDomain(entity.entity_id))
    return Object.entries(grouped).map(([domain, entities]) => ({
      id: `type-${domain}`,
      name: formatGroupName(domain + 's'),
      entities: entities as EntityWithRegistry[],
    }))
  })

  // Group by usage frequency
  const groupByFrequency = computed<EntityGroup[]>(() => {
    const sortedEntities = [...allEntities.value].sort((a, b) => {
      const usageA = rootStore.usageStats[a.entity_id] || 0
      const usageB = rootStore.usageStats[b.entity_id] || 0
      return usageB - usageA // Sort descending
    })

    // Create frequency bins
    const groups: EntityGroup[] = []
    const maxUsage = Math.max(...Object.values(rootStore.usageStats), 1)

    if (maxUsage === 0) {
      // No usage data yet
      return [
        {
          id: 'freq-all',
          name: 'All Entities',
          entities: sortedEntities,
        },
      ]
    }

    // High usage (top 25%)
    const highUsage = sortedEntities.filter((e) => {
      const usage = rootStore.usageStats[e.entity_id] || 0
      return usage >= maxUsage * 0.5
    })

    if (highUsage.length > 0) {
      groups.push({
        id: 'freq-high',
        name: 'Most Used',
        entities: highUsage,
      })
    }

    // Medium usage (25-75%)
    const mediumUsage = sortedEntities.filter((e) => {
      const usage = rootStore.usageStats[e.entity_id] || 0
      return usage > 0 && usage < maxUsage * 0.5
    })

    if (mediumUsage.length > 0) {
      groups.push({
        id: 'freq-medium',
        name: 'Sometimes Used',
        entities: mediumUsage,
      })
    }

    // Rarely used (0 usage)
    const rarelyUsed = sortedEntities.filter((e) => {
      const usage = rootStore.usageStats[e.entity_id] || 0
      return usage === 0
    })

    if (rarelyUsed.length > 0) {
      groups.push({
        id: 'freq-low',
        name: 'Rarely Used',
        entities: rarelyUsed,
      })
    }

    return groups
  })

  // No grouping - flat list sorted by usage
  const ungrouped = computed<EntityGroup[]>(() => {
    const sortedEntities = [...allEntities.value].sort((a, b) => {
      const usageA = rootStore.usageStats[a.entity_id] || 0
      const usageB = rootStore.usageStats[b.entity_id] || 0
      return usageB - usageA
    })

    return [
      {
        id: 'ungrouped-all',
        name: 'All Entities',
        entities: sortedEntities,
      },
    ]
  })

  // Get current groups based on mode
  const currentGroups = computed<EntityGroup[]>(() => {
    switch (groupingMode.value) {
      case 'room':
        return groupByRoom.value
      case 'entity_type':
        return groupByEntityType.value
      case 'frequency':
        return groupByFrequency.value
      case 'none':
        return ungrouped.value
      default:
        return groupByRoom.value
    }
  })

  // Set grouping mode
  const setGroupingMode = (mode: GroupingMode) => {
    groupingMode.value = mode
    localStorage.setItem('grouping-mode', mode)
  }

  // Load saved grouping mode
  const loadGroupingMode = () => {
    const saved = localStorage.getItem('grouping-mode') as GroupingMode
    if (saved && ['room', 'entity_type', 'frequency', 'none'].includes(saved)) {
      groupingMode.value = saved
    }
  }

  // Initialize
  loadGroupingMode()

  return {
    groupingMode,
    currentGroups,
    setGroupingMode,
    allEntities,
  }
}
