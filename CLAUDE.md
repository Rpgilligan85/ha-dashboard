# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Vue 3 + TypeScript dashboard application for Home Assistant. It displays and controls smart home entities (lights, fans, remotes, etc.) organized by room/area. The app connects to Home Assistant via WebSocket and can also operate with local JSON data for development.

## Build Commands

- `npm install` - Install dependencies (requires Node.js ^20.19.0 || >=22.12.0)
- `npm run dev` - Start development server with hot-reload on port 3000 (exposed to network via --host)
- `npm run build` - Type-check and build for production
- `npm run build-only` - Build without type-checking
- `npm run type-check` - Run TypeScript type checking with vue-tsc
- `npm run preview` - Preview production build locally
- `npm run lint` - Run both oxlint and eslint with auto-fix
- `npm run lint:oxlint` - Run oxlint only (correctness checks)
- `npm run lint:eslint` - Run eslint only
- `npm run format` - Format src/ directory with Prettier

## Architecture

### State Management (Pinia)

The main application state is in `src/stores/root.ts` (useRootStore):

- **Connection Management**: Handles both live Home Assistant WebSocket connections and local development data (JSON files in `src/assets/`)
- **Data Structure**: Creates a denormalized structure by combining:
  - Device registry (from Home Assistant or local `devices.json`)
  - Entity registry (from `entities.json`)
  - Live entity states (from WebSocket or `ent.json`)
- **Key Computed Property**: `getDataByArea` groups entities by room/area for rendering
- **Entity Updates**: `updateState()` toggles entities (on/off) either locally or via WebSocket callService

### UI Architecture

**Main App Flow** (`src/App.vue`):
1. On mount, loads data via `rootStore.loadData()`
2. Iterates through `getDataByArea` to render rooms
3. Each room contains `EntityCard` components for each entity

**Component System**:
- `src/components/EntityCard.vue` - Interactive card for each entity (light, fan, remote, etc.)
- `src/volt/Card.vue` - Styled wrapper around PrimeVue Card using unstyled mode with custom passthrough options
- Uses `@jamescoyle/vue-icon` with Material Design Icons (`@mdi/js`)

### Styling System

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **PrimeVue v4** in unstyled mode - all styling via Tailwind using passthrough (pt) options
- **PrimeUI Tailwind Plugin** (`tailwindcss-primeui`) for design tokens
- **PrimeFlex** and **PrimeIcons** also available
- Custom styling in `src/assets/base.css` and component-level `<style>` blocks (including SCSS)

### Path Alias

`@` is aliased to `./src` directory (configured in vite.config.ts)

### Environment Variables

The app expects:
- `VITE_HA_URL` - Home Assistant URL
- `VITE_HA_TOKEN` - Long-lived access token

Local development uses `useLocalData = true` to work with static JSON files instead.

### Data Flow

1. **Development Mode** (useLocalData: true):
   - Loads entities from `src/assets/ent.json`
   - Loads device/entity registry from `devices.json` and `entities.json`
   - State changes are simulated locally

2. **Production Mode** (useLocalData: false):
   - Connects to Home Assistant WebSocket API
   - Fetches device/entity registries via WebSocket
   - Subscribes to real-time entity state updates
   - Calls services to control entities

3. **Entity Filtering**:
   - Only entities with prefixes: `light.`, `remote.`, `fan.`, `select.` are displayed
   - Entities must be associated with a device that has an area_id

## TypeScript Configuration

Uses Vue's recommended TypeScript project references setup:
- `tsconfig.json` - Root config with references to node and app configs
- `tsconfig.app.json` - Application code configuration
- `tsconfig.node.json` - Build tooling configuration

## Notable Dependencies

- **Vite**: Using `rolldown-vite` (aliased as "vite") for faster builds
- **home-assistant-js-websocket**: Official HA WebSocket library
- **lodash**: Used for `groupBy` in data processing
- **PrimeVue ecosystem**: UI components, icons, flex utilities
- **Vue Router**: Configured but currently has no routes defined

## Linting

Dual linting setup:
- **Oxlint**: Fast, correctness-focused linter (runs first)
- **ESLint**: Vue/TypeScript/Prettier integration (runs second)
- ESLint config disables multi-word component name requirement

## Development Notes

- The router (`src/router/index.ts`) is configured but has no routes - app is currently single-page
- Weather icons are available in `src/assets/weather-icons/` but not currently used
- The Volt component system (`src/volt/`) is a custom PrimeVue wrapper for consistent theming
