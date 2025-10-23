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

import entitiesWS from '@/assets/ent.json' with {type: 'json'};
import entityList from '@/assets/entities.json' with {type: 'json'};
import deviceList from '@/assets/devices.json' with {type: 'json'};

export const useRootStore = defineStore('root', () => {
  const entities: Ref<HassEntities | null> = ref(null)
  const connection: Ref<Connection | null> = ref(null)
  const haUrl = ref<string>(import.meta.env.VITE_HA_URL)
  const token = ref<string>(import.meta.env.VITE_HA_TOKEN)
  const listOfEntities = ['light.', 'remote.', 'fan.', 'select.']
  const toggleEvents = ['light.', 'remote.', 'fan.']
  const useLocalData = ref(true);
  const finalData = ref<any[]>([]);

  const getDataByArea: Ref<Record<string, any[]>> = computed(() => {
    return groupBy(finalData.value, 'area_id')
  })

  const loadData = async (): Promise<void> => {
    if (useLocalData.value) {
      entities.value = entitiesWS as HassEntities;
      console.log('entitiesWS', entitiesWS);
      console.log('entityList', entityList);
      console.log('deviceList', deviceList);
      await createDatastructure(deviceList, entityList)
    } else {
      try {
        const auth = createLongLivedTokenAuth(haUrl.value, token.value)
        const conn = await createConnection({ auth })

        connection.value = conn

        const deviceList: any[] = await conn.sendMessagePromise({ type: 'config/device_registry/list' })
        const entityList: any[] = await conn.sendMessagePromise({ type: 'config/entity_registry/list' })

        subscribeEntities(conn, (ent: HassEntities) => {
          entities.value = ent
          console.log('ENT', ent)
        })

        await createDatastructure(deviceList, entityList)
      } catch (error) {
        console.error('Failed to connect to Home Assistant:', error)
        throw error
      }
    }
  }

  const createDatastructure = async (deviceList: any[], entityList: any[]): Promise<any[]> => {
    try {
      const filteredDevices = deviceList.filter((device) => device.area_id)

      for (const device of filteredDevices) {
        for (const entity of entityList) {
          if (entity.device_id === device.id) {
            if (listOfEntities.some((prefix) => entity.entity_id.startsWith(prefix))) {
              finalData.value.push({ ...entity, area_id: device.area_id, device_name: device.name })
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

  const updateState = async (entityId: string, state: string): Promise<void> => {
    if (!connection.value && useLocalData.value === false) {
      console.error('No active connection to Home Assistant')
      return
    }
    if (useLocalData.value) {
      entities.value[entityId].state = state === 'on' ? 'off' : 'on'
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
    loadData,
    entities,
    haUrl,
    token,
    createDatastructure,
    updateState,
    toggleEvents,
    getDataByArea
  }
})
