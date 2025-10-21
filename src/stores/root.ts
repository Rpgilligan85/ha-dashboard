import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import {
  createLongLivedTokenAuth,
  createConnection,
  subscribeEntities,
  callService,
  type HassEntities,
  type HassServices,
  type Connection,
} from 'home-assistant-js-websocket'
import { groupBy } from 'lodash'

export const useRootStore = defineStore('root', () => {
  const entities: Ref<HassEntities | null> = ref(null)
  const connection: Ref<Connection | null> = ref(null)
  const haUrl = ref<string>(import.meta.env.VITE_HA_URL)
  const token = ref<string>(import.meta.env.VITE_HA_TOKEN)
  const listOfEntities = ['light.', 'remote.', 'fan.', 'select.']
  const toggleEvents = ['light.', 'remote.', 'fan.']

  const connect = async (): Promise<void> => {
    try {
      const auth = createLongLivedTokenAuth(haUrl.value, token.value)
      const conn = await createConnection({ auth })
      connection.value = conn

      subscribeEntities(conn, (ent: HassEntities) => {
        entities.value = ent
        console.log('ENT', ent)
      })

      await getAllDevices()
    } catch (error) {
      console.error('Failed to connect to Home Assistant:', error)
      throw error
    }
  }

  const getAllDevices = async (): Promise<any[]> => {
    try {
      const auth = createLongLivedTokenAuth(haUrl.value, token.value)
      const conn = await createConnection({ auth })

      const devices = await conn.sendMessagePromise({ type: 'config/device_registry/list' })
      const entities = await conn.sendMessagePromise({ type: 'config/entity_registry/list' })

      const filteredDevices = devices.filter((device) => device.area_id)

      for (const device of filteredDevices) {
        device.entities = []
        for (const entity of entities) {
          if (entity.device_id === device.id) {
            if (listOfEntities.some((prefix) => entity.entity_id.startsWith(prefix))) {
              device.entities.push(entity)
            }
          }
        }
      }

      console.log(filteredDevices)
      return groupBy(filteredDevices, 'area_id')
    } catch (error) {
      console.error('Failed to fetch devices:', error)
      throw error
    }
  }

  const updateState = async (entityId: string, state: boolean): Promise<void> => {
    if (!connection.value) {
      console.error('No active connection to Home Assistant')
      return
    }

    try {
      // Extract the domain from the entity_id (e.g., "light" from "light.living_room")
      const domain = entityId.split('.')[0]
      const service = state ? 'turn_on' : 'turn_off'

      await callService(connection.value, domain, service, {
        entity_id: entityId,
      })

      console.log(`Successfully called ${domain}.${service} for ${entityId}`)
    } catch (error) {
      console.error('Failed to update state:', error)
      throw error
    }
  }

  return {
    env: import.meta.env,
    connect,
    entities,
    haUrl,
    token,
    getAllDevices,
    updateState,
    toggleEvents,
  }
})
