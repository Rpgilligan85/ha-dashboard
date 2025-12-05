<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRootStore } from '@/stores/root'
import { callService } from 'home-assistant-js-websocket'
import type { HAClimateEntity } from '@/types/homeassistant'
// @ts-expect-error - vue-icon types not available
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiFire, mdiSnowflake, mdiPower } from '@mdi/js'

type ThermostatMode = 'heat' | 'cool' | 'heat_cool' | 'off'

interface Props {
  entityId?: string // Optional: if provided, will use Home Assistant entity
  currentTemp?: number
  targetTempHeat?: number
  targetTempCool?: number
  mode?: ThermostatMode
  hvacAction?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentTemp: 67,
  targetTempHeat: 67,
  targetTempCool: 70,
  mode: 'heat_cool',
  hvacAction: 'idle',
})

const rootStore = useRootStore()

// Get climate entity data from Home Assistant if entityId is provided
const climateEntity = computed(() => {
  if (!props.entityId || !rootStore.entities) return null
  return rootStore.entities[props.entityId] as HAClimateEntity | null
})

// Use entity data when available, fallback to props
const entityCurrentTemp = computed(() => {
  return climateEntity.value?.attributes?.current_temperature ?? props.currentTemp
})

const entityTargetTempHeat = computed(() => {
  return (
    climateEntity.value?.attributes?.target_temp_low ??
    climateEntity.value?.attributes?.temperature ??
    props.targetTempHeat
  )
})

const entityTargetTempCool = computed(() => {
  return (
    climateEntity.value?.attributes?.target_temp_high ??
    climateEntity.value?.attributes?.temperature ??
    props.targetTempCool
  )
})

const entityMode = computed(() => {
  return (climateEntity.value?.state as ThermostatMode) ?? props.mode
})

const entityHvacAction = computed(() => {
  return climateEntity.value?.attributes?.hvac_action ?? props.hvacAction
})

const entityName = computed(() => {
  return climateEntity.value?.attributes?.friendly_name ?? 'Nest Thermostat'
})

const emit = defineEmits<{
  'update:mode': [mode: ThermostatMode]
  'update:targetTempHeat': [temp: number]
  'update:targetTempCool': [temp: number]
}>()

const currentMode = ref<ThermostatMode>(entityMode.value)
const localHeatTemp = ref(entityTargetTempHeat.value)
const localCoolTemp = ref(entityTargetTempCool.value)
const selectedTemp = ref<'heat' | 'cool'>('cool') // Which temperature is currently selected for adjustment

// Watch for entity state changes and sync to local state
watch([entityMode, entityTargetTempHeat, entityTargetTempCool], ([newMode, newHeat, newCool]) => {
  currentMode.value = newMode
  localHeatTemp.value = newHeat
  localCoolTemp.value = newCool
})

// SVG circle parameters (viewBox is 320x320)
const centerX = 160
const centerY = 160
const radius = 120
const strokeWidth = 20

// Temperature and angle constants
const MIN_TEMP = 50
const MAX_TEMP = 90
const ROTATION_OFFSET = -90 // SVG group is rotated -90 degrees (counter-clockwise)
const START_ANGLE = 315 // Lower-left after rotation (heat side)
const END_ANGLE = 585 // Lower-right after rotation (cool side) - 270 degree arc

// Dragging state
const svgRef = ref<SVGSVGElement | null>(null)
const isDraggingHeat = ref(false)
const isDraggingCool = ref(false)

// Home Assistant service call helpers
const callClimateSetTemperature = async (
  temperature?: number,
  tempLow?: number,
  tempHigh?: number,
) => {
  if (!props.entityId || !rootStore.connection) {
    // If no entityId, just emit for parent component
    if (tempLow !== undefined) emit('update:targetTempHeat', tempLow)
    if (tempHigh !== undefined) emit('update:targetTempCool', tempHigh)
    if (temperature !== undefined) {
      if (currentMode.value === 'heat') emit('update:targetTempHeat', temperature)
      if (currentMode.value === 'cool') emit('update:targetTempCool', temperature)
    }
    return
  }

  try {
    const serviceData: any = { entity_id: props.entityId }

    if (currentMode.value === 'heat_cool') {
      // For heat_cool mode, use target_temp_low and target_temp_high
      serviceData.target_temp_low = tempLow ?? localHeatTemp.value
      serviceData.target_temp_high = tempHigh ?? localCoolTemp.value
    } else {
      // For heat or cool mode, use temperature
      serviceData.temperature =
        temperature ?? (currentMode.value === 'heat' ? localHeatTemp.value : localCoolTemp.value)
    }

    await callService(rootStore.connection, 'climate', 'set_temperature', serviceData)
  } catch (error) {
    console.error('Failed to set temperature:', error)
  }
}

const callClimateSetHvacMode = async (mode: ThermostatMode) => {
  if (!props.entityId || !rootStore.connection) {
    // If no entityId, just emit for parent component
    emit('update:mode', mode)
    return
  }

  try {
    await callService(rootStore.connection, 'climate', 'set_hvac_mode', {
      entity_id: props.entityId,
      hvac_mode: mode,
    })
  } catch (error) {
    console.error('Failed to set HVAC mode:', error)
  }
}

// Convert temperature to angle
const tempToAngle = (temp: number): number => {
  const clamped = Math.max(MIN_TEMP, Math.min(MAX_TEMP, temp))
  return START_ANGLE + ((clamped - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) * (END_ANGLE - START_ANGLE)
}

// Convert angle to temperature
const angleToTemp = (angle: number): number => {
  // Normalize angle to 0-360
  let normalizedAngle = angle % 360
  if (normalizedAngle < 0) normalizedAngle += 360

  // Handle angles in the arc range (315° to 585°, which is 315° to 225° wrapping around)
  // If angle is between 0° and 225°, it's in the upper part of the arc
  // If angle is between 315° and 360°, it's in the lower part of the arc
  let arcAngle = normalizedAngle

  // Convert to arc coordinate system (315° to 585°)
  if (normalizedAngle >= 0 && normalizedAngle <= 225) {
    arcAngle = normalizedAngle + 360 // Convert to 360-585 range
  }

  // Clamp to arc range
  if (arcAngle < START_ANGLE) {
    arcAngle = START_ANGLE
  } else if (arcAngle > END_ANGLE) {
    arcAngle = END_ANGLE
  }

  const temp =
    MIN_TEMP + ((arcAngle - START_ANGLE) / (END_ANGLE - START_ANGLE)) * (MAX_TEMP - MIN_TEMP)
  return Math.round(Math.max(MIN_TEMP, Math.min(MAX_TEMP, temp)))
}

// Calculate arc paths (using 0,0 as center because of group transform)
const describeArc = (startAngle: number, endAngle: number) => {
  const start = polarToCartesian(0, 0, radius, endAngle)
  const end = polarToCartesian(0, 0, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

// Heat arc - from start to heat temperature
const heatAngle = computed(() => tempToAngle(localHeatTemp.value))
const heatArcPath = computed(() => describeArc(START_ANGLE, heatAngle.value))
const heatMarkerPosition = computed(() => polarToCartesian(0, 0, radius, heatAngle.value))

// Cool arc - from cool temperature to end
const coolAngle = computed(() => tempToAngle(localCoolTemp.value))
const coolArcPath = computed(() => describeArc(coolAngle.value, END_ANGLE))
const coolMarkerPosition = computed(() => polarToCartesian(0, 0, radius, coolAngle.value))

const showHeatArc = computed(() => currentMode.value !== 'cool')
const showCoolArc = computed(() => currentMode.value !== 'heat')

const displayTemp = computed(() => {
  if (currentMode.value === 'heat_cool') {
    return localCoolTemp.value
  } else if (currentMode.value === 'heat') {
    return localHeatTemp.value
  } else if (currentMode.value === 'cool') {
    return localCoolTemp.value
  }
  return props.currentTemp
})

const displayHeatTemp = computed(() => {
  return localHeatTemp.value
})

// Get mouse/touch position and convert to angle
const getAngleFromEvent = (event: MouseEvent | TouchEvent): number => {
  if (!svgRef.value) return 0

  const rect = svgRef.value.getBoundingClientRect()
  const clientX = 'touches' in event ? (event.touches[0]?.clientX ?? 0) : event.clientX
  const clientY = 'touches' in event ? (event.touches[0]?.clientY ?? 0) : event.clientY

  // Convert mouse position to SVG coordinates (320x320 viewBox)
  const svgX = ((clientX - rect.left) / rect.width) * 320
  const svgY = ((clientY - rect.top) / rect.height) * 320

  // Get position relative to center
  const x = svgX - centerX
  const y = svgY - centerY

  // Calculate angle (this gives us the angle in the rotated view)
  let angle = (Math.atan2(y, x) * 180) / Math.PI + 90

  // Add rotation offset to convert to unrotated coordinate system (negative rotation means we add it back)
  angle = angle + Math.abs(ROTATION_OFFSET)

  if (angle < 0) angle += 360
  if (angle >= 360) angle -= 360

  return angle
}

// Drag handlers
const startDragHeat = () => {
  isDraggingHeat.value = true
}

const startDragCool = () => {
  isDraggingCool.value = true
}

const handleDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDraggingHeat.value && !isDraggingCool.value) return

  event.preventDefault()
  const angle = getAngleFromEvent(event)
  const temp = angleToTemp(angle)

  if (isDraggingHeat.value) {
    localHeatTemp.value = Math.min(temp, localCoolTemp.value - 1) // Heat must be less than cool
    // Don't call service on every drag event - will be called on stopDrag
  } else if (isDraggingCool.value) {
    localCoolTemp.value = Math.max(temp, localHeatTemp.value + 1) // Cool must be greater than heat
    // Don't call service on every drag event - will be called on stopDrag
  }
}

const stopDrag = async () => {
  const wasHeat = isDraggingHeat.value
  const wasCool = isDraggingCool.value

  isDraggingHeat.value = false
  isDraggingCool.value = false

  // Call service with final temperature after drag completes
  if (wasHeat || wasCool) {
    if (currentMode.value === 'heat_cool') {
      await callClimateSetTemperature(undefined, localHeatTemp.value, localCoolTemp.value)
    } else if (wasHeat) {
      await callClimateSetTemperature(localHeatTemp.value)
    } else if (wasCool) {
      await callClimateSetTemperature(localCoolTemp.value)
    }
  }
}

const setMode = async (mode: ThermostatMode) => {
  currentMode.value = mode
  await callClimateSetHvacMode(mode)

  // Auto-select the appropriate temperature based on mode
  if (mode === 'heat') {
    selectedTemp.value = 'heat'
  } else if (mode === 'cool') {
    selectedTemp.value = 'cool'
  }
  // In heat_cool mode, keep current selection
}

const selectHeatTemp = () => {
  if (currentMode.value === 'heat_cool' || currentMode.value === 'heat') {
    selectedTemp.value = 'heat'
  }
}

const selectCoolTemp = () => {
  if (currentMode.value === 'heat_cool' || currentMode.value === 'cool') {
    selectedTemp.value = 'cool'
  }
}

const adjustTemp = async (delta: number) => {
  if (currentMode.value === 'heat' || selectedTemp.value === 'heat') {
    const newTemp = Math.max(MIN_TEMP, Math.min(MAX_TEMP, localHeatTemp.value + delta))
    // In heat_cool mode, ensure heat doesn't exceed cool
    if (currentMode.value === 'heat_cool') {
      localHeatTemp.value = Math.min(newTemp, localCoolTemp.value - 1)
      await callClimateSetTemperature(undefined, localHeatTemp.value, localCoolTemp.value)
    } else {
      localHeatTemp.value = newTemp
      await callClimateSetTemperature(localHeatTemp.value)
    }
  } else if (currentMode.value === 'cool' || selectedTemp.value === 'cool') {
    const newTemp = Math.max(MIN_TEMP, Math.min(MAX_TEMP, localCoolTemp.value + delta))
    // In heat_cool mode, ensure cool doesn't go below heat
    if (currentMode.value === 'heat_cool') {
      localCoolTemp.value = Math.max(newTemp, localHeatTemp.value + 1)
      await callClimateSetTemperature(undefined, localHeatTemp.value, localCoolTemp.value)
    } else {
      localCoolTemp.value = newTemp
      await callClimateSetTemperature(localCoolTemp.value)
    }
  }
}
</script>

<template>
  <div class="nest-thermostat">
    <div class="thermostat-header">
      <h2 class="title">{{ entityName }}</h2>
      <button class="menu-button">⋮</button>
    </div>

    <div
      class="thermostat-display"
      @mousemove="handleDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
      @touchmove="handleDrag"
      @touchend="stopDrag"
      @touchcancel="stopDrag"
    >
      <svg ref="svgRef" viewBox="0 0 260 260" class="thermostat-svg">
        <g transform="translate(130, 140) rotate(-90)">
          <!-- Heat arc (orange) -->
          <path
            v-if="showHeatArc"
            :d="heatArcPath"
            class="arc arc-heat"
            :stroke-width="strokeWidth"
            fill="none"
          />
          <!-- Heat indicator dot -->
          <circle
            v-if="showHeatArc"
            :cx="heatMarkerPosition.x"
            :cy="heatMarkerPosition.y"
            r="12"
            class="marker marker-heat"
            @mousedown="startDragHeat"
            @touchstart="startDragHeat"
          />

          <!-- Cool arc (blue) -->
          <path
            v-if="showCoolArc"
            :d="coolArcPath"
            class="arc arc-cool"
            :stroke-width="strokeWidth"
            fill="none"
          />
          <!-- Cool indicator dot -->
          <circle
            v-if="showCoolArc"
            :cx="coolMarkerPosition.x"
            :cy="coolMarkerPosition.y"
            r="12"
            class="marker marker-cool"
            @mousedown="startDragCool"
            @touchstart="startDragCool"
          />
        </g>
      </svg>

      <!-- Center content overlay -->
      <div class="center-content">
        <div
          class="status-text"
          :class="{
            'status-heating': entityHvacAction === 'heating',
            'status-cooling': entityHvacAction === 'cooling',
          }"
        >
          {{ entityHvacAction }}
        </div>
        <div class="temperature-display">
          <!-- Heat/Cool Mode: Show both temperatures -->
          <div v-if="currentMode === 'heat_cool'" class="dual-temp-display">
            <div
              class="target-temp clickable"
              :class="{ selected: selectedTemp === 'heat' }"
              @click="selectHeatTemp"
            >
              {{ localHeatTemp }}<span class="temp-unit">°F</span>
            </div>
            <div
              class="target-temp clickable"
              :class="{ selected: selectedTemp === 'cool' }"
              @click="selectCoolTemp"
            >
              {{ localCoolTemp }}<span class="temp-unit">°F</span>
            </div>
          </div>

          <!-- Heat/Cool/Off Mode: Show single temperature -->
          <div v-else class="target-temp">
            {{ currentMode === 'off' ? 'Off' : displayTemp
            }}<span v-if="currentMode !== 'off'" class="temp-unit">°F</span>
          </div>
        </div>
        <div
          class="small-temp"
          :class="{
            'heating-glow': entityHvacAction === 'heating',
            'cooling-glow': entityHvacAction === 'cooling',
          }"
        >
          🌡 {{ entityCurrentTemp }}°F
        </div>
      </div>

      <!-- Temperature adjustment buttons -->
      <div class="temp-controls">
        <button
          class="temp-button"
          :class="{
            'heat-selected': selectedTemp === 'heat',
            'cool-selected': selectedTemp === 'cool',
          }"
          @click="adjustTemp(-1)"
        >
          <span>−</span>
        </button>
        <button
          class="temp-button"
          :class="{
            'heat-selected': selectedTemp === 'heat',
            'cool-selected': selectedTemp === 'cool',
          }"
          @click="adjustTemp(1)"
        >
          <span>+</span>
        </button>
      </div>
    </div>

    <!-- Mode buttons -->
    <div class="mode-controls">
      <button
        class="mode-button"
        :class="{ active: currentMode === 'heat' }"
        @click="setMode('heat')"
        title="Heat"
      >
        <SvgIcon type="mdi" :path="mdiFire" />
      </button>
      <button
        class="mode-button"
        :class="{ active: currentMode === 'cool' }"
        @click="setMode('cool')"
        title="Cool"
      >
        <SvgIcon type="mdi" :path="mdiSnowflake" />
      </button>
      <button
        class="mode-button"
        :class="{ active: currentMode === 'heat_cool' }"
        @click="setMode('heat_cool')"
        title="Heat/Cool"
      >
        <SvgIcon type="mdi" :path="mdiSnowflake" />
      </button>
      <button
        class="mode-button"
        :class="{ active: currentMode === 'off' }"
        @click="setMode('off')"
        title="Off"
      >
        <SvgIcon type="mdi" :path="mdiPower" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.nest-thermostat {
  background: transparent;
  border: none;
  border-radius: 0.75rem;
  padding: 1.5rem;
  color: var(--p-text-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: none;
}

.p-dark .nest-thermostat {
  background: transparent;
}

.thermostat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;

  .title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--p-text-muted-color);
    text-align: center;
    width: 100%;
  }

  .menu-button {
    background: none;
    border: none;
    color: var(--p-text-muted-color);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    transition: all 0.2s;

    &:hover {
      color: var(--p-text-color);
      background: var(--p-content-hover-background);
    }
  }
}

.thermostat-display {
  position: relative;
  margin-bottom: 24px;
  user-select: none;
}

.thermostat-svg {
  width: 100%;
  height: auto;
  display: block;
}

.center-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  gap: 8px;
}

.status-text {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;

  &.status-heating {
    color: #f97316;
    font-weight: 700;
  }

  &.status-cooling {
    color: var(--p-primary-500);
    font-weight: 700;
  }
}

.p-dark .status-text {
  &.status-heating {
    color: #fb923c;
  }

  &.status-cooling {
    color: var(--p-primary-400);
  }
}

.temperature-display {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.current-temp,
.target-temp {
  font-size: 4rem;
  font-weight: 300;
  color: var(--p-text-color);
  line-height: 1;
}

.target-temp {
  opacity: 0.7;
  font-size: 3rem;

  &.clickable {
    pointer-events: auto;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    margin: -0.25rem -0.5rem;

    &:hover {
      opacity: 1;
      transform: scale(1.05);
    }

    &.selected {
      opacity: 1;
      color: var(--p-highlight-color);
    }
  }
}

.dual-temp-display {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
}

.temp-unit {
  font-size: 0.5em;
  font-weight: 300;
  opacity: 0.7;
}

.small-temp {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 1.5rem;
  transition: all 0.3s ease;

  &.heating-glow {
    color: #f97316;
    background: rgba(249, 115, 22, 0.1);
    box-shadow:
      0 0 20px rgba(249, 115, 22, 0.4),
      0 0 40px rgba(249, 115, 22, 0.2);
    animation: pulse-heating 2s ease-in-out infinite;
  }

  &.cooling-glow {
    color: var(--p-primary-500);
    background: rgba(6, 182, 212, 0.1);
    box-shadow:
      0 0 20px rgba(6, 182, 212, 0.4),
      0 0 40px rgba(6, 182, 212, 0.2);
    animation: pulse-cooling 2s ease-in-out infinite;
  }
}

.p-dark .small-temp {
  &.heating-glow {
    color: #fb923c;
    background: rgba(251, 146, 60, 0.15);
    box-shadow:
      0 0 25px rgba(251, 146, 60, 0.5),
      0 0 50px rgba(251, 146, 60, 0.25);
  }

  &.cooling-glow {
    color: var(--p-primary-400);
    background: rgba(34, 211, 238, 0.15);
    box-shadow:
      0 0 25px rgba(34, 211, 238, 0.5),
      0 0 50px rgba(34, 211, 238, 0.25);
  }
}

@keyframes pulse-heating {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(249, 115, 22, 0.4),
      0 0 40px rgba(249, 115, 22, 0.2);
  }
  50% {
    box-shadow:
      0 0 30px rgba(249, 115, 22, 0.6),
      0 0 60px rgba(249, 115, 22, 0.3);
  }
}

@keyframes pulse-cooling {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(6, 182, 212, 0.4),
      0 0 40px rgba(6, 182, 212, 0.2);
  }
  50% {
    box-shadow:
      0 0 30px rgba(6, 182, 212, 0.6),
      0 0 60px rgba(6, 182, 212, 0.3);
  }
}

.arc {
  stroke-linecap: round;
  opacity: 0.8;
  transition: opacity 0.3s ease;

  &.arc-heat {
    stroke: #f97316;
  }

  &.arc-cool {
    stroke: var(--p-primary-500);
  }
}

.p-dark .arc {
  &.arc-heat {
    stroke: #fb923c;
  }

  &.arc-cool {
    stroke: var(--p-primary-400);
  }
}

.marker {
  cursor: grab;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));

  &:hover {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  }

  &:active {
    cursor: grabbing;
  }

  &.marker-heat {
    fill: #f97316;
  }

  &.marker-cool {
    fill: var(--p-primary-500);
  }
}

.p-dark .marker {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));

  &:hover {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
  }

  &.marker-heat {
    fill: #fb923c;
  }

  &.marker-cool {
    fill: var(--p-primary-400);
  }
}

.temp-controls {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
}

.temp-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--p-content-border-color);
  background: var(--p-surface-0);
  color: var(--p-text-color);
  font-size: 2rem;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  span {
    margin-bottom: 0.375rem;
    margin-left: 0.125rem;
  }

  &.heat-selected {
    border-color: #f97316;
    border-width: 2px;
    background: #fff7ed;
    color: #f97316;
  }

  &.cool-selected {
    border-color: var(--p-primary-500);
    border-width: 2px;
    background: var(--p-primary-50);
    color: var(--p-primary-700);
  }

  &:hover {
    background: var(--p-content-hover-background);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: scale(0.95) translateY(0);
  }
}

.p-dark .temp-button {
  background: var(--p-surface-700);
  border-color: var(--p-surface-600);

  &.heat-selected {
    background: rgba(251, 146, 60, 0.1);
    color: #fb923c;
  }

  &.cool-selected {
    background: var(--p-highlight-background);
    color: var(--p-primary-400);
  }

  &:hover {
    background: var(--p-surface-600);
  }
}

.mode-controls {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  background: var(--p-surface-100);
  border-radius: 0.75rem;
  padding: 0.5rem;
}

.p-dark .mode-controls {
  background: var(--p-surface-900);
}

.mode-button {
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  color: var(--p-text-muted-color);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  &:hover {
    background: var(--p-content-hover-background);
    color: var(--p-text-color);
  }

  &.active {
    background: var(--p-primary-500);
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.p-dark .mode-button {
  &.active {
    background: var(--p-primary-600);
  }
}
</style>
