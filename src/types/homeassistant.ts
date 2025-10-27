// Home Assistant Entity Types

export interface HAEntityBase {
  entity_id: string
  state: string
  last_changed: string
  last_updated: string
  context: {
    id: string
    parent_id: string | null
    user_id: string | null
  }
}

export interface HAClimateEntity extends HAEntityBase {
  state: 'heat' | 'cool' | 'heat_cool' | 'off' | 'auto' | 'dry' | 'fan_only'
  attributes: {
    hvac_modes: string[]
    min_temp: number
    max_temp: number
    fan_modes?: string[]
    preset_modes?: string[]
    current_temperature: number
    temperature: number | null
    target_temp_high?: number
    target_temp_low?: number
    current_humidity?: number
    fan_mode?: string
    hvac_action: 'off' | 'heating' | 'cooling' | 'idle' | 'drying' | 'fan'
    preset_mode?: string
    friendly_name: string
    supported_features: number
  }
}

export interface HAWeatherEntity extends HAEntityBase {
  state: string
  attributes: {
    temperature: number
    temperature_unit: string
    humidity: number
    pressure?: number
    pressure_unit?: string
    wind_speed?: number
    wind_speed_unit?: string
    wind_bearing?: number
    visibility?: number
    visibility_unit?: string
    forecast?: Array<{
      condition: string
      datetime: string
      temperature: number
      templow?: number
      precipitation?: number
      precipitation_probability?: number
    }>
    friendly_name: string
  }
}

export interface HALightEntity extends HAEntityBase {
  state: 'on' | 'off'
  attributes: {
    min_color_temp_kelvin?: number
    max_color_temp_kelvin?: number
    min_mireds?: number
    max_mireds?: number
    supported_color_modes?: string[]
    color_mode?: string
    brightness?: number
    color_temp?: number
    rgb_color?: [number, number, number]
    friendly_name: string
    supported_features: number
  }
}

export interface HAFanEntity extends HAEntityBase {
  state: 'on' | 'off'
  attributes: {
    percentage?: number
    preset_mode?: string
    preset_modes?: string[]
    speed_list?: string[]
    friendly_name: string
    supported_features: number
  }
}

export interface HASwitchEntity extends HAEntityBase {
  state: 'on' | 'off'
  attributes: {
    friendly_name: string
  }
}

export interface HARemoteEntity extends HAEntityBase {
  state: 'on' | 'off'
  attributes: {
    friendly_name: string
    supported_features: number
  }
}

export type HAEntity =
  | HAClimateEntity
  | HAWeatherEntity
  | HALightEntity
  | HAFanEntity
  | HASwitchEntity
  | HARemoteEntity
  | HAEntityBase

export interface HAEntities {
  [entity_id: string]: HAEntity
}

// Device Registry Types
export interface HADevice {
  id: string
  name: string
  name_by_user?: string
  area_id: string | null
  manufacturer?: string
  model?: string
  sw_version?: string
  disabled_by?: string | null
  config_entries: string[]
  connections: Array<[string, string]>
  identifiers: Array<[string, string]>
}

// Entity Registry Types
export interface HAEntityRegistryEntry {
  entity_id: string
  name?: string
  original_name: string
  unique_id: string
  platform: string
  device_id?: string
  area_id?: string
  disabled_by?: string | null
  hidden_by?: string | null
  icon?: string
  has_entity_name: boolean
  entity_category?: string | null
}

// Extended entity with registry data
export interface EntityWithRegistry extends HAEntityRegistryEntry {
  area_id: string
  device_name?: string
}
