import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import {
  createLongLivedTokenAuth,
  createConnection,
  subscribeEntities,
  subscribeServices,
  type HassEntities,
  type HassServices,
  type Connection,
} from 'home-assistant-js-websocket'

export const useRootStore = defineStore('root', () => {
  const entities: Ref<HassEntities | null> = ref(null)
  const haUrl = ref<string>(import.meta.env.VITE_HA_URL)
  const token = ref<string>(import.meta.env.VITE_HA_TOKEN)
  const connection: Ref<Connection | null> = ref(null)

  const connect = async (): Promise<void> => {
    try {
      const auth = createLongLivedTokenAuth(haUrl.value, token.value)
      const conn = await createConnection({ auth })

      connection.value = conn

      subscribeEntities(conn, (ent: HassEntities) => {
        entities.value = ent
        console.log('ENT', ent)
      })

      subscribeServices(conn, (services: HassServices) => {
        console.log('Services subscribed:', services)
      })
    } catch (error) {
      console.error('Failed to connect to Home Assistant:', error)
      throw error
    }
  }

  return {
    env: import.meta.env,
    connect,
    entities,
    connection,
    haUrl,
    token,
  }
})
