<template>
  <Card class="thermostat-card" :class="`thermostat-mode-${currentMode}`">
    <template #content>
      <div class="thermostat-content">
        <!-- Header with name and current mode badge -->
        <div class="thermostat-header">
          <div class="thermostat-name">{{ entityName }}</div>
          <div class="current-mode-badge" :class="`mode-${currentMode}`">
            {{ formatMode(currentMode) }}
          </div>
        </div>

        <!-- Circular temperature display with slider -->
        <div class="temperature-display-container">
          <svg
            class="temperature-ring"
            viewBox="0 0 240 240"
            @mousedown="handleRingMouseDown"
            @touchstart="handleRingTouchStart"
          >
            <!-- Define gradient for heat_cool mode -->
            <defs>
              <linearGradient id="gradient-ring" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color: #ff6b6b; stop-opacity: 1" />
                <stop offset="100%" style="stop-color: #4dabf7; stop-opacity: 1" />
              </linearGradient>
            </defs>

            <!-- Background circle -->
            <circle
              cx="120"
              cy="120"
              r="100"
              fill="none"
              stroke="var(--ring-background)"
              stroke-width="12"
            />

            <!-- For heat_cool mode: show two separate arcs on left/right -->
            <template v-if="currentMode === 'heat_cool'">
              <!-- Cool arc (left side - blue) - runs from bottom (270°) up to cool temp position -->
              <path
                :d="coolArcPath"
                fill="none"
                stroke="#4dabf7"
                stroke-width="12"
                stroke-linecap="round"
                class="progress-ring"
              />
              <!-- Heat arc (right side - orange/red) - runs from bottom (270°) up to heat temp position -->
              <path
                :d="heatArcPath"
                fill="none"
                stroke="#ff6b6b"
                stroke-width="12"
                stroke-linecap="round"
                class="progress-ring"
              />
            </template>

            <!-- For single-temp modes: show one arc -->
            <template v-else>
              <circle
                cx="120"
                cy="120"
                r="100"
                fill="none"
                :stroke="getRingColor(currentMode)"
                stroke-width="12"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="ringOffset"
                transform="rotate(-90 120 120)"
                class="progress-ring"
              />
            </template>

            <!-- Draggable handles -->
            <template v-if="canControl && currentMode === 'heat_cool'">
              <!-- Cool handle (left side - blue) -->
              <circle
                :cx="coolHandleX"
                :cy="coolHandleY"
                r="8"
                fill="#4dabf7"
                stroke="white"
                stroke-width="3"
                class="temp-handle"
                :class="{ active: isDraggingCool }"
                @mousedown.stop="startDraggingCool"
                @touchstart.stop="startDraggingCool"
              />
              <!-- Heat handle (right side - orange/red) -->
              <circle
                :cx="heatHandleX"
                :cy="heatHandleY"
                r="8"
                fill="#ff6b6b"
                stroke="white"
                stroke-width="3"
                class="temp-handle"
                :class="{ active: isDraggingHeat }"
                @mousedown.stop="startDraggingHeat"
                @touchstart.stop="startDraggingHeat"
              />
            </template>

            <!-- Single handle for heat/cool modes -->
            <template v-else-if="canControl && currentMode !== 'off'">
              <circle
                :cx="singleTempHandleX"
                :cy="singleTempHandleY"
                r="8"
                :fill="getRingColor(currentMode)"
                stroke="white"
                stroke-width="3"
                class="temp-handle"
                :class="{ active: isDragging }"
                @mousedown.stop="startDragging"
                @touchstart.stop="startDragging"
              />
            </template>
          </svg>

          <div class="temperature-circle">
            <div class="temperature-inner">
              <!-- Current temperature -->
              <div class="current-temp">
                <span class="temp-value">{{ currentTemperature }}</span>
                <span class="temp-unit">°</span>
              </div>

              <!-- Target temperature -->
              <div class="target-temp-display">
                <svg-icon type="mdi" :path="getTargetIcon()" class="target-icon" />
                <span class="target-value">{{ targetTemperature }}°</span>
              </div>

              <!-- Temperature adjustment buttons -->
              <div class="temp-adjust-buttons">
                <button
                  class="temp-btn temp-down"
                  @click="decreaseTemperature"
                  :disabled="!canControl || isProcessing"
                  aria-label="Decrease temperature"
                >
                  <svg-icon type="mdi" :path="mdiMinus" />
                </button>
                <button
                  class="temp-btn temp-up"
                  @click="increaseTemperature"
                  :disabled="!canControl || isProcessing"
                  aria-label="Increase temperature"
                >
                  <svg-icon type="mdi" :path="mdiPlus" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- HVAC Mode selector - Icon only with hover labels -->
        <div class="hvac-modes-compact">
          <button
            v-for="mode in availableModes"
            :key="mode"
            class="mode-btn"
            :class="{ active: currentMode === mode }"
            :disabled="isProcessing"
            @click="setMode(mode)"
            :aria-label="formatMode(mode)"
          >
            <svg-icon type="mdi" :path="getModeIcon(mode)" class="mode-icon" />
            <span class="mode-tooltip">{{ formatMode(mode) }}</span>
          </button>
        </div>

        <!-- Additional info -->
        <div v-if="showAdditionalInfo" class="additional-info">
          <div class="info-item">
            <svg-icon type="mdi" :path="mdiWaterPercent" class="info-icon" />
            <span class="info-value">{{ humidity }}%</span>
          </div>
          <div v-if="hvacAction" class="info-item">
            <div class="status-indicator" :class="`status-${hvacAction}`"></div>
            <span class="info-value">{{ formatAction(hvacAction) }}</span>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRootStore } from '@/stores/root'
import Card from '@/volt/Card.vue'
// @ts-expect-error - vue-icon types not available
import SvgIcon from '@jamescoyle/vue-icon'
import {
  mdiPlus,
  mdiMinus,
  mdiSnowflake,
  mdiFire,
  mdiAutorenew,
  mdiPower,
  mdiWaterPercent,
  mdiThermometer,
} from '@mdi/js'

const rootStore = useRootStore()
const props = defineProps<{
  entityId: string
}>()

// Loading state for API calls
const isProcessing = ref(false)

// Drag state
const isDragging = ref(false)
const isDraggingHeat = ref(false)
const isDraggingCool = ref(false)

const climateData = computed(() => {
  return rootStore.entities?.[props.entityId]
})

const entityName = computed(() => {
  return climateData.value?.attributes?.friendly_name || 'Thermostat'
})

const currentTemperature = computed(() => {
  const temp = climateData.value?.attributes?.current_temperature
  return temp !== undefined ? Math.round(temp) : '--'
})

const targetTemperature = computed(() => {
  const attrs = climateData.value?.attributes
  if (!attrs) return '--'

  // For heat_cool/auto mode, show the range
  if (currentMode.value === 'heat_cool') {
    const low = attrs.target_temp_low
    const high = attrs.target_temp_high
    if (low !== undefined && high !== undefined) {
      return `${Math.round(low)}-${Math.round(high)}`
    }
  }

  // For single temperature modes
  const temp = attrs.temperature
  return temp !== undefined && temp !== null ? Math.round(temp) : '--'
})

const targetTempLow = computed(() => {
  const temp = climateData.value?.attributes?.target_temp_low
  return temp !== undefined ? Math.round(temp) : null
})

const targetTempHigh = computed(() => {
  const temp = climateData.value?.attributes?.target_temp_high
  return temp !== undefined ? Math.round(temp) : null
})

const currentMode = computed(() => {
  return climateData.value?.state || 'off'
})

const humidity = computed(() => {
  return climateData.value?.attributes?.current_humidity
})

const hvacAction = computed(() => {
  return climateData.value?.attributes?.hvac_action
})

const showAdditionalInfo = computed(() => {
  return humidity.value !== undefined || hvacAction.value !== undefined
})

// Only heat, cool, heat_cool, and off
const availableModes = ['heat', 'cool', 'heat_cool', 'off']

const canControl = computed(() => {
  return currentMode.value !== 'off'
})

// Circular progress ring calculations
const circumference = 2 * Math.PI * 100

// Helper function to calculate ring offset from temperature
const calcRingOffset = (temp: number | null): number => {
  if (typeof temp !== 'number') return circumference

  const attrs = climateData.value?.attributes
  if (!attrs) return circumference

  const minTemp = attrs.min_temp || 50
  const maxTemp = attrs.max_temp || 90
  const range = maxTemp - minTemp

  const percentage = Math.max(0, Math.min(100, ((temp - minTemp) / range) * 100))
  return circumference - (percentage / 100) * circumference
}

// For single-temp modes (heat/cool)
const ringOffset = computed(() => {
  if (!canControl.value) return circumference

  const current = currentTemperature.value
  if (typeof current !== 'number') return circumference

  return calcRingOffset(current)
})

// For heat_cool mode - separate offsets for low and high
const lowTempRingOffset = computed(() => {
  const temp = targetTempLow.value
  return calcRingOffset(temp)
})

const highTempRingOffset = computed(() => {
  const temp = targetTempHigh.value
  return calcRingOffset(temp)
})

// Helper to create SVG arc path
const createArcPath = (startAngle: number, endAngle: number): string => {
  const radius = 100
  const centerX = 120
  const centerY = 120

  // Convert angles to radians
  const startRad = ((startAngle - 90) * Math.PI) / 180
  const endRad = ((endAngle - 90) * Math.PI) / 180

  // Calculate start and end points
  const startX = centerX + radius * Math.cos(startRad)
  const startY = centerY + radius * Math.sin(startRad)
  const endX = centerX + radius * Math.cos(endRad)
  const endY = centerY + radius * Math.sin(endRad)

  // Determine if we should use the large arc flag
  const deltaAngle = endAngle - startAngle
  const largeArcFlag = deltaAngle > 180 ? 1 : 0

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
}

// Helper to convert temperature to angle on left side (180° to 0° range, going counter-clockwise)
// Bottom = 270° (50°F), Top = 90° (90°F)
const tempToLeftAngle = (temp: number): number => {
  const attrs = climateData.value?.attributes
  if (!attrs) return 270

  const minTemp = attrs.min_temp || 50
  const maxTemp = attrs.max_temp || 90
  const range = maxTemp - minTemp

  // Map temperature to 0-1 range
  const percentage = Math.max(0, Math.min(1, (temp - minTemp) / range))

  // Left side: 270° (bottom) to 90° (top)
  // This is a 180° arc going counter-clockwise
  return 270 - percentage * 180
}

// Helper to convert temperature to angle on right side (0° to 180° range, going clockwise)
// Bottom = 270° (50°F), Top = 90° (90°F)
const tempToRightAngle = (temp: number): number => {
  const attrs = climateData.value?.attributes
  if (!attrs) return 270

  const minTemp = attrs.min_temp || 50
  const maxTemp = attrs.max_temp || 90
  const range = maxTemp - minTemp

  // Map temperature to 0-1 range
  const percentage = Math.max(0, Math.min(1, (temp - minTemp) / range))

  // Right side: 270° (bottom) to 90° (top)
  // This is a 180° arc going clockwise
  return 270 + percentage * 180
}

// Helper to convert left side angle to temperature
const leftAngleToTemp = (angle: number): number => {
  const attrs = climateData.value?.attributes
  if (!attrs) return 70

  const minTemp = attrs.min_temp || 50
  const maxTemp = attrs.max_temp || 90
  const range = maxTemp - minTemp

  // Normalize angle to left side range (90° to 270°)
  let normalizedAngle = angle % 360
  if (normalizedAngle < 0) normalizedAngle += 360

  // Clamp to left side
  if (normalizedAngle > 270 || normalizedAngle < 90) {
    normalizedAngle = normalizedAngle > 270 ? 270 : 90
  }

  // Map 270° -> 0%, 90° -> 100%
  const percentage = (270 - normalizedAngle) / 180
  const temp = minTemp + percentage * range

  return Math.round(temp * 2) / 2
}

// Helper to convert right side angle to temperature
const rightAngleToTemp = (angle: number): number => {
  const attrs = climateData.value?.attributes
  if (!attrs) return 70

  const minTemp = attrs.min_temp || 50
  const maxTemp = attrs.max_temp || 90
  const range = maxTemp - minTemp

  // Normalize angle to right side range (90° to 270°, going through 0°)
  let normalizedAngle = angle % 360
  if (normalizedAngle < 0) normalizedAngle += 360

  // Clamp to right side (270° through 0° to 90°)
  if (normalizedAngle > 90 && normalizedAngle < 270) {
    normalizedAngle = normalizedAngle < 180 ? 90 : 270
  }

  // Map angle to percentage: 270° -> 0%, 90° -> 100%
  let percentage: number
  if (normalizedAngle >= 270) {
    percentage = (normalizedAngle - 270) / 180
  } else {
    percentage = (90 + normalizedAngle) / 180
  }

  const temp = minTemp + percentage * range
  return Math.round(temp * 2) / 2
}

// Arc paths for heat_cool mode
const coolArcPath = computed(() => {
  // Cool arc on left side: from 270° (bottom) to cool temp angle
  const coolTemp = targetTempHigh.value
  if (typeof coolTemp !== 'number') return ''

  const startAngle = 270 // bottom
  const endAngle = tempToLeftAngle(coolTemp)

  return createArcPath(startAngle, endAngle)
})

const heatArcPath = computed(() => {
  // Heat arc on right side: from 270° (bottom) to heat temp angle
  const heatTemp = targetTempLow.value
  if (typeof heatTemp !== 'number') return ''

  const startAngle = 270 // bottom
  const endAngle = tempToRightAngle(heatTemp)

  return createArcPath(startAngle, endAngle)
})

// Helper to convert temperature to angle (0 = top, clockwise)
const tempToAngle = (temp: number | null): number => {
  if (typeof temp !== 'number') return 0

  const attrs = climateData.value?.attributes
  if (!attrs) return 0

  const minTemp = attrs.min_temp || 50
  const maxTemp = attrs.max_temp || 90
  const range = maxTemp - minTemp

  const percentage = Math.max(0, Math.min(100, ((temp - minTemp) / range) * 100))
  return (percentage / 100) * 360
}

// Helper to convert angle to temperature
const angleToTemp = (angle: number): number => {
  const attrs = climateData.value?.attributes
  if (!attrs) return 70

  const minTemp = attrs.min_temp || 50
  const maxTemp = attrs.max_temp || 90
  const range = maxTemp - minTemp

  // Normalize angle to 0-360
  let normalizedAngle = angle % 360
  if (normalizedAngle < 0) normalizedAngle += 360

  const percentage = normalizedAngle / 360
  const temp = minTemp + percentage * range

  // Round to nearest 0.5 degree
  return Math.round(temp * 2) / 2
}

// Calculate handle positions on the circle (r=100, center=120,120)
const calcHandlePosition = (angle: number): { x: number; y: number } => {
  const radius = 100
  const centerX = 120
  const centerY = 120

  // Convert angle to radians (subtract 90 to start from top)
  const radians = ((angle - 90) * Math.PI) / 180

  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  }
}

// Handle positions for single temp mode
const singleTempHandleX = computed(() => {
  const attrs = climateData.value?.attributes
  const temp = attrs?.temperature
  if (typeof temp !== 'number') return 120

  const angle = tempToAngle(temp)
  return calcHandlePosition(angle).x
})

const singleTempHandleY = computed(() => {
  const attrs = climateData.value?.attributes
  const temp = attrs?.temperature
  if (typeof temp !== 'number') return 20

  const angle = tempToAngle(temp)
  return calcHandlePosition(angle).y
})

// Handle positions for heat_cool mode
// Cool handle on LEFT side
const coolHandleX = computed(() => {
  const temp = targetTempHigh.value
  if (typeof temp !== 'number') return 20

  const angle = tempToLeftAngle(temp)
  return calcHandlePosition(angle).x
})

const coolHandleY = computed(() => {
  const temp = targetTempHigh.value
  if (typeof temp !== 'number') return 120

  const angle = tempToLeftAngle(temp)
  return calcHandlePosition(angle).y
})

// Heat handle on RIGHT side
const heatHandleX = computed(() => {
  const temp = targetTempLow.value
  if (typeof temp !== 'number') return 220

  const angle = tempToRightAngle(temp)
  return calcHandlePosition(angle).x
})

const heatHandleY = computed(() => {
  const temp = targetTempLow.value
  if (typeof temp !== 'number') return 120

  const angle = tempToRightAngle(temp)
  return calcHandlePosition(angle).y
})

// Helper to calculate angle from mouse/touch position
const calculateAngleFromPosition = (clientX: number, clientY: number, svg: SVGSVGElement): number => {
  const rect = svg.getBoundingClientRect()
  const svgCenterX = rect.left + rect.width / 2
  const svgCenterY = rect.top + rect.height / 2

  const dx = clientX - svgCenterX
  const dy = clientY - svgCenterY

  // Calculate angle in degrees (0 = top, clockwise)
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  if (angle < 0) angle += 360

  return angle
}

// Drag handlers for single temp mode
const startDragging = (e: MouseEvent | TouchEvent) => {
  if (!canControl.value || isProcessing.value) return
  e.preventDefault()
  isDragging.value = true
}

// Drag handlers for heat_cool mode
const startDraggingHeat = (e: MouseEvent | TouchEvent) => {
  if (!canControl.value || isProcessing.value) return
  e.preventDefault()
  isDraggingHeat.value = true
}

const startDraggingCool = (e: MouseEvent | TouchEvent) => {
  if (!canControl.value || isProcessing.value) return
  e.preventDefault()
  isDraggingCool.value = true
}

// Handle ring clicks/touches for direct temperature setting
const handleRingMouseDown = (e: MouseEvent) => {
  if (!canControl.value || isProcessing.value) return

  const svg = e.currentTarget as SVGSVGElement
  const angle = calculateAngleFromPosition(e.clientX, e.clientY, svg)

  // Set appropriate temperature based on mode
  if (currentMode.value === 'heat_cool') {
    // In heat_cool mode, determine which side based on angle
    // Left side: 90° to 270° (cool)
    // Right side: 270° to 90° (going through 0°) (heat)
    if (angle > 90 && angle < 270) {
      // Left side - cool
      startDraggingCool(e)
    } else {
      // Right side - heat
      startDraggingHeat(e)
    }
  } else {
    startDragging(e)
  }
}

const handleRingTouchStart = (e: TouchEvent) => {
  if (!canControl.value || isProcessing.value || e.touches.length === 0) return

  const touch = e.touches[0]
  if (!touch) return

  const svg = e.currentTarget as SVGSVGElement
  const angle = calculateAngleFromPosition(touch.clientX, touch.clientY, svg)

  if (currentMode.value === 'heat_cool') {
    // Determine which side based on angle
    if (angle > 90 && angle < 270) {
      // Left side - cool
      startDraggingCool(e)
    } else {
      // Right side - heat
      startDraggingHeat(e)
    }
  } else {
    startDragging(e)
  }
}

// Handle mouse/touch move
const handleMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value && !isDraggingHeat.value && !isDraggingCool.value) return

  const svg = document.querySelector('.temperature-ring') as SVGSVGElement
  if (!svg) return

  const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0]?.clientX
  const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0]?.clientY

  if (clientX === undefined || clientY === undefined) return

  const angle = calculateAngleFromPosition(clientX, clientY, svg)

  // Update the appropriate temperature
  if (isDragging.value) {
    // Single temp mode
    const newTemp = angleToTemp(angle)
    setTemperature({ temperature: newTemp })
  } else if (isDraggingHeat.value) {
    // Heat_cool mode - heat (right side, controls target_temp_low)
    const newTemp = rightAngleToTemp(angle)
    setTemperature({ target_temp_low: newTemp })
  } else if (isDraggingCool.value) {
    // Heat_cool mode - cool (left side, controls target_temp_high)
    const newTemp = leftAngleToTemp(angle)
    setTemperature({ target_temp_high: newTemp })
  }
}

// Handle mouse/touch end
const handleEnd = () => {
  isDragging.value = false
  isDraggingHeat.value = false
  isDraggingCool.value = false
}

// Set up global event listeners
onMounted(() => {
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('touchmove', handleMove)
  document.addEventListener('touchend', handleEnd)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMove)
  document.removeEventListener('mouseup', handleEnd)
  document.removeEventListener('touchmove', handleMove)
  document.removeEventListener('touchend', handleEnd)
})

const increaseTemperature = async () => {
  if (!canControl.value || isProcessing.value) return

  const mode = currentMode.value
  const attrs = climateData.value?.attributes

  if (mode === 'heat_cool') {
    // Increase the high temperature in heat_cool mode
    const currentHigh = targetTempHigh.value
    if (typeof currentHigh === 'number') {
      await setTemperature({ target_temp_high: currentHigh + 1 })
    }
  } else {
    // Increase single temperature for heat/cool modes
    const temp = attrs?.temperature
    if (typeof temp === 'number') {
      await setTemperature({ temperature: temp + 1 })
    }
  }
}

const decreaseTemperature = async () => {
  if (!canControl.value || isProcessing.value) return

  const mode = currentMode.value
  const attrs = climateData.value?.attributes

  if (mode === 'heat_cool') {
    // Decrease the low temperature in heat_cool mode
    const currentLow = targetTempLow.value
    if (typeof currentLow === 'number') {
      await setTemperature({ target_temp_low: currentLow - 1 })
    }
  } else {
    // Decrease single temperature for heat/cool modes
    const temp = attrs?.temperature
    if (typeof temp === 'number') {
      await setTemperature({ temperature: temp - 1 })
    }
  }
}

const setTemperature = async (tempData: {
  temperature?: number
  target_temp_high?: number
  target_temp_low?: number
}) => {
  if (isProcessing.value) return

  isProcessing.value = true

  try {
    // If we have a live connection, use the WebSocket API
    if (rootStore.connection) {
      const { callService } = await import('home-assistant-js-websocket')

      const serviceData: Record<string, unknown> = {
        entity_id: props.entityId,
      }

      const mode = currentMode.value
      const attrs = climateData.value?.attributes

      // For heat_cool mode, BOTH target_temp_high and target_temp_low are required
      if (mode === 'heat_cool') {
        // Get current values and merge with any updates
        const currentLow = attrs?.target_temp_low
        const currentHigh = attrs?.target_temp_high

        serviceData.target_temp_low = tempData.target_temp_low ?? currentLow
        serviceData.target_temp_high = tempData.target_temp_high ?? currentHigh

        console.log('Setting heat_cool temps:', {
          low: serviceData.target_temp_low,
          high: serviceData.target_temp_high,
        })
      } else {
        // For heat/cool modes, use single temperature (do NOT use if hvac_mode is heat_cool)
        if (tempData.temperature !== undefined) {
          serviceData.temperature = tempData.temperature
          console.log('Setting temperature:', serviceData.temperature)
        }
      }

      await callService(rootStore.connection, 'climate', 'set_temperature', serviceData)
      console.log('✓ Temperature set successfully')
    } else {
      // For local/offline mode, update the mock value directly
      if (climateData.value) {
        if (tempData.temperature !== undefined) {
          climateData.value.attributes.temperature = tempData.temperature
        }
        if (tempData.target_temp_high !== undefined) {
          climateData.value.attributes.target_temp_high = tempData.target_temp_high
        }
        if (tempData.target_temp_low !== undefined) {
          climateData.value.attributes.target_temp_low = tempData.target_temp_low
        }
        console.log('✓ Temperature updated (offline mode):', tempData)
      }
    }
  } catch (error) {
    console.error('✗ Failed to set temperature:', error)
    // TODO: Show error notification to user
  } finally {
    isProcessing.value = false
  }
}

const setMode = async (mode: string) => {
  if (isProcessing.value) return

  isProcessing.value = true

  try {
    // If we have a live connection, use the WebSocket API
    if (rootStore.connection) {
      const { callService } = await import('home-assistant-js-websocket')

      await callService(rootStore.connection, 'climate', 'set_hvac_mode', {
        entity_id: props.entityId,
        hvac_mode: mode,
      })
      console.log('✓ HVAC mode set successfully:', mode)
    } else {
      // For local/offline mode, update the mock value directly
      if (climateData.value) {
        climateData.value.state = mode

        // Set default temperature values when switching modes in offline mode
        if (mode === 'heat' && !climateData.value.attributes.temperature) {
          climateData.value.attributes.temperature = 70
        } else if (mode === 'cool' && !climateData.value.attributes.temperature) {
          climateData.value.attributes.temperature = 72
        } else if (mode === 'heat_cool') {
          if (!climateData.value.attributes.target_temp_low) {
            climateData.value.attributes.target_temp_low = 67
          }
          if (!climateData.value.attributes.target_temp_high) {
            climateData.value.attributes.target_temp_high = 70
          }
        }
        console.log('✓ HVAC mode updated (offline mode):', mode)
      }
    }
  } catch (error) {
    console.error('✗ Failed to set HVAC mode:', error)
    // TODO: Show error notification to user
  } finally {
    isProcessing.value = false
  }
}

const formatMode = (mode: string): string => {
  const modeMap: Record<string, string> = {
    off: 'Off',
    heat: 'Heat',
    cool: 'Cool',
    heat_cool: 'Auto',
  }
  return modeMap[mode] || mode
}

const formatAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    heating: 'Heating',
    cooling: 'Cooling',
    idle: 'Idle',
    off: 'Off',
  }
  return actionMap[action] || action
}

const getModeIcon = (mode: string): string => {
  const iconMap: Record<string, string> = {
    off: mdiPower,
    heat: mdiFire,
    cool: mdiSnowflake,
    heat_cool: mdiAutorenew,
  }
  return iconMap[mode] || mdiAutorenew
}

const getTargetIcon = (): string => {
  return mdiThermometer
}

const getRingColor = (mode: string): string => {
  const colorMap: Record<string, string> = {
    heat: '#ff6b6b',
    cool: '#4dabf7',
    heat_cool: 'url(#gradient-ring)',
    off: 'var(--p-surface-400)',
  }
  return colorMap[mode] || 'var(--p-surface-400)'
}
</script>

<style scoped>
.thermostat-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  min-width: 320px;
  max-width: 400px;
}

.p-dark .thermostat-card {
  background: var(--p-surface-800);
  border-color: var(--p-surface-700);
}

.thermostat-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Header */
.thermostat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thermostat-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.current-mode-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.current-mode-badge.mode-heat {
  background: #ff6b6b;
  color: white;
}

.current-mode-badge.mode-cool {
  background: #4dabf7;
  color: white;
}

.current-mode-badge.mode-heat_cool {
  background: linear-gradient(135deg, #ff6b6b 0%, #4dabf7 100%);
  color: white;
}

.current-mode-badge.mode-off {
  background: var(--p-surface-300);
  color: var(--p-text-muted-color);
}

.p-dark .current-mode-badge.mode-off {
  background: var(--p-surface-600);
}

/* Temperature Display with Circular Slider */
.temperature-display-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;
}

.temperature-ring {
  width: 240px;
  height: 240px;
  position: absolute;
  --ring-background: var(--p-surface-200);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.p-dark .temperature-ring {
  --ring-background: var(--p-surface-600);
}

.progress-ring {
  transition:
    stroke-dashoffset 0.3s ease,
    stroke 0.3s ease;
  pointer-events: none;
}

.temp-handle {
  cursor: grab;
  transition:
    r 0.2s ease,
    filter 0.2s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.temp-handle:hover {
  r: 10;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.temp-handle.active {
  cursor: grabbing;
  r: 10;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
}

.temperature-circle {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-50);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.p-dark .temperature-circle {
  background: var(--p-surface-800);
}

.temperature-inner {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.current-temp {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.temp-value {
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1;
}

.temp-unit {
  font-size: 2rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.target-temp-display {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--p-surface-100);
  border-radius: 1rem;
}

.p-dark .target-temp-display {
  background: var(--p-surface-700);
}

.target-icon {
  width: 1rem;
  height: 1rem;
  fill: var(--p-text-muted-color);
}

.target-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.temp-adjust-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.temp-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: none;
  background: var(--p-primary-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.temp-btn:hover:not(:disabled) {
  background: var(--p-primary-600);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.temp-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.temp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.temp-btn svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: white;
}

/* HVAC Modes - Compact Icon-only with hover labels */
.hvac-modes-compact {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--p-surface-100);
  border-radius: 1rem;
}

.p-dark .hvac-modes-compact {
  background: var(--p-surface-700);
}

.mode-btn {
  position: relative;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--p-surface-0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.p-dark .mode-btn {
  background: var(--p-surface-800);
}

.mode-btn:hover:not(:disabled) {
  border-color: var(--p-primary-400);
  transform: scale(1.1);
}

.mode-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mode-btn.active {
  border-color: var(--p-primary-500);
  background: var(--p-primary-50);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.p-dark .mode-btn.active {
  background: var(--p-primary-900);
}

.mode-icon {
  width: 1.5rem;
  height: 1.5rem;
  fill: var(--p-text-muted-color);
  transition: fill 0.2s ease;
}

.mode-btn.active .mode-icon {
  fill: var(--p-primary-600);
}

.mode-tooltip {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.375rem 0.75rem;
  background: var(--p-surface-900);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.p-dark .mode-tooltip {
  background: var(--p-surface-950);
}

.mode-btn:hover .mode-tooltip {
  opacity: 1;
}

.mode-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 0.25rem solid transparent;
  border-top-color: var(--p-surface-900);
}

.p-dark .mode-tooltip::after {
  border-top-color: var(--p-surface-950);
}

/* Additional Info */
.additional-info {
  display: flex;
  justify-content: center;
  gap: 2rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-surface-200);
}

.p-dark .additional-info {
  border-top-color: var(--p-surface-700);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.info-icon {
  width: 1.25rem;
  height: 1.25rem;
  fill: var(--p-text-muted-color);
}

.info-value {
  color: var(--p-text-color);
  font-weight: 600;
}

.status-indicator {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--p-surface-400);
}

.status-indicator.status-heating {
  background: #ff6b6b;
  box-shadow: 0 0 8px rgba(255, 107, 107, 0.6);
}

.status-indicator.status-cooling {
  background: #4dabf7;
  box-shadow: 0 0 8px rgba(77, 171, 247, 0.6);
}

.status-indicator.status-idle {
  background: var(--p-surface-400);
}

/* Responsive */
@media (max-width: 640px) {
  .thermostat-card {
    min-width: auto;
    max-width: 100%;
  }

  .thermostat-content {
    padding: 1.25rem;
  }

  .temperature-ring {
    width: 220px;
    height: 220px;
  }

  .temperature-circle {
    width: 180px;
    height: 180px;
  }

  .temp-value {
    font-size: 3rem;
  }

  .additional-info {
    gap: 1rem;
  }
}
</style>
