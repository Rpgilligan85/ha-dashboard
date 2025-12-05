import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import {
  createLongLivedTokenAuth,
  createConnection,
  subscribeEntities,
  callService,
  type Connection,
  type HassEntities,
} from 'home-assistant-js-websocket'
import { groupBy } from 'lodash'
import type {
  HAEntities,
  HADevice,
  HAEntityRegistryEntry,
  EntityWithRegistry,
} from '@/types/homeassistant'

import entitiesWS from '@/assets/ent.json' with { type: 'json' }
import entityList from '@/assets/entities.json' with { type: 'json' }
import deviceList from '@/assets/devices.json' with { type: 'json' }

export const useRootStore = defineStore('root', () => {
  const entities: Ref<HAEntities | null> = ref(null)
  const connection: Ref<Connection | null> = ref(null)
  const haUrl = ref<string>(import.meta.env.VITE_HA_URL)
  const token = ref<string>(import.meta.env.VITE_HA_TOKEN)
  const listOfEntities = ['light.', 'remote.', 'fan.', 'select.', 'switch.light', 'climate.']
  const toggleEvents = ['light.', 'remote.', 'fan.', 'switch.light']
  const ignoreList = ['switch.light_led', 'select.ceiling_fan_light_preset']
  const useLocalData = ref(true)
  const finalData = ref<EntityWithRegistry[]>([])

  // Usage tracking
  const usageStats = ref<Record<string, number>>({})

  // Load usage stats from localStorage
  const loadUsageStats = () => {
    try {
      const saved = localStorage.getItem('entity-usage-stats')
      if (saved) {
        usageStats.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error)
    }
  }

  // Save usage stats to localStorage
  const saveUsageStats = () => {
    try {
      localStorage.setItem('entity-usage-stats', JSON.stringify(usageStats.value))
    } catch (error) {
      console.error('Failed to save usage stats:', error)
    }
  }

  // Track entity usage
  const trackEntityUsage = (entityId: string) => {
    if (!usageStats.value[entityId]) {
      usageStats.value[entityId] = 0
    }
    usageStats.value[entityId]++
    saveUsageStats()
  }

  // Load usage stats on store initialization
  loadUsageStats()

  const getDataByArea = computed<Record<string, EntityWithRegistry[]>>(() => {
    return groupBy(finalData.value, 'area_id')
  })

  const loadData = async (): Promise<void> => {
    if (useLocalData.value) {
      entities.value = entitiesWS as HAEntities
      console.log('entitiesWS', entitiesWS)
      console.log('entityList', entityList)
      console.log('deviceList', deviceList)
      await createDatastructure(deviceList, entityList)
    } else {
      try {
        const auth = createLongLivedTokenAuth(haUrl.value, token.value)
        const conn = await createConnection({ auth })

        connection.value = conn

        const deviceList: HADevice[] = await conn.sendMessagePromise({
          type: 'config/device_registry/list',
        })
        const entityList: HAEntityRegistryEntry[] = await conn.sendMessagePromise({
          type: 'config/entity_registry/list',
        })
        console.log('deviceList', deviceList)
        console.log('entityList', entityList)

        subscribeEntities(conn, (ent: HassEntities) => {
          entities.value = ent as HAEntities
          console.log('ENT', ent)
        })

        await createDatastructure(deviceList, entityList)
      } catch (error) {
        console.error('Failed to connect to Home Assistant:', error)
        throw error
      }
    }
  }

  const createDatastructure = async (
    deviceList: HADevice[] | any[],
    entityList: HAEntityRegistryEntry[] | any[],
  ) => {
    try {
      const filteredDevices = deviceList.filter((device) => device.area_id)

      // Process entities with devices
      for (const device of filteredDevices) {
        for (const entity of entityList) {
          if (entity.device_id === device.id) {
            // Check if entity matches listOfEntities and is not in ignoreList
            const matchesPrefix = listOfEntities.some((prefix) =>
              entity.entity_id.startsWith(prefix),
            )
            const isIgnored = ignoreList.some((ignored) => entity.entity_id === ignored)

            if (matchesPrefix && !isIgnored) {
              finalData.value.push({
                ...entity,
                area_id: device.area_id,
                device_name: device.name,
              } as EntityWithRegistry)
            }
          }
        }
      }

      finalData.value.sort((a, b) => {
        if (a.entity_id < b.entity_id) return -1
        if (a.entity_id > b.entity_id) return 1
        return 0
      })
      console.log('finalData', finalData.value)
    } catch (error) {
      console.error('Failed to fetch devices:', error)
      throw error
    }
  }

  const updateState = async (
    entityId: string | undefined,
    state: string | undefined,
  ): Promise<void> => {
    if (!connection.value && useLocalData.value === false) {
      console.error('No active connection to Home Assistant')
      return
    }

    // Track usage
    if (entityId) {
      trackEntityUsage(entityId)
    }

    if (useLocalData.value && entityId && entities.value && entities.value[entityId]) {
      entities.value[entityId].state = state === 'on' ? 'off' : 'on'
      return
    }

    try {
      // Extract the domain from the entity_id (e.g., "light" from "light.living_room")
      const domain = entityId?.split('.')[0]
      const service = state === 'on' ? 'turn_off' : 'turn_on'
      if (connection.value && domain) {
        await callService(connection.value, domain, service, {
          entity_id: entityId,
        })
      }
    } catch (error) {
      console.error('Failed to update state:', error)
      throw error
    }
  }

  return {
    env: import.meta.env,
    loadData,
    entities,
    connection,
    haUrl,
    token,
    usageStats,
    trackEntityUsage,
    createDatastructure,
    updateState,
    toggleEvents,
    getDataByArea,
  }
})
