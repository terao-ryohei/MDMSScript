# CLAUDE.md

必ず返答は日本語を使う。
必ずMinecraft BedrockEditionで利用可能な実装をする。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MDMS (Murder Mystery Detection System) is a sophisticated Minecraft Bedrock Edition addon that implements a 7-phase murder mystery game in a fantasy medieval town setting. Players take on dual roles (murderer/accomplice/citizen + medieval jobs like king/merchant/guard) and participate in evidence collection, investigation, and voting to identify the culprit.

## Development Commands

### Build & Development
- `npm run build` - Full production build (TypeScript → JS → .mcaddon → .zip)
- `npm run watch` - Continuous TypeScript compilation during development
- `npm run clean` - Remove dist directory
- `npm run compile` - TypeScript compilation only

### Build Pipeline
The build process runs in sequence:
1. `tsc -p tsconfig.json` - TypeScript compilation to JavaScript
2. `node scripts/build.mjs` - Copy files to dist structure
3. `node scripts/makeMcaddon.mjs` - Package as .mcaddon for Minecraft
4. `node scripts/makeZip.mjs` - Create final distribution zip

### Code Quality
- **Linter**: Biome.js configured in `biome.json`
- **Style**: 2-space indentation, double quotes for JavaScript
- **TypeScript**: Strict mode enabled, ESNext target

## System Architecture

### Manager-Based Architecture Pattern
The codebase follows a sophisticated manager-based architecture with clear separation of concerns. Each manager implements well-defined interfaces and handles specific game subsystems:

**Core Managers** (located in `src/managers/`):
- **GameManager** - Central coordinator, singleton pattern, game state management
- **PhaseManager** - 7-phase game progression with timer-based transitions
- **EvidenceManager** & **EvidenceAnalyzer** - Evidence collection, reliability scoring, correlation analysis
- **RoleAssignmentManager** & **OccupationAssignmentManager** - Dual role system (murder mystery roles + medieval jobs)
- **RoleUIManager** & **OccupationUIManager** - Player interface management
- **CommunicationManager** - Player interaction systems
- **TimerManager** - Game timing and countdown displays

### Key Design Patterns
- **Singleton**: GameManager ensures single game instance
- **Observer**: Event-driven architecture for game state changes
- **Strategy**: Pluggable evidence analysis algorithms
- **Factory**: Evidence object creation and player ability instantiation
- **Interface Segregation**: Each manager implements focused interfaces (IGameManager, IPhaseManager, etc.)

### Type System Organization
Comprehensive TypeScript type definitions in `src/types/`:
- **GameTypes** - Core game state, configuration, player states
- **RoleTypes** - Murder mystery roles (murderer, accomplice, citizen)
- **OccupationTypes** - Fantasy medieval jobs with unique abilities/tasks
- **EvidenceTypes** - Evidence classification and metadata
- **PhaseType** - Game phase definitions and transitions
- **AbilityTypes** - Player abilities and power system

## Game System Overview

### Seven-Phase Game Flow
1. **Preparation** (10min) - Role/job assignment, map exploration
2. **Daily Life** (15-20min) - 3 Minecraft days, job tasks, potential murder
3. **Investigation** (12min) - Evidence collection post-incident
4. **Meeting** (9min) - Discussion and information sharing
5. **Re-investigation & Secret Talks** (9min) - Additional evidence gathering
6. **Deduction** (6min) - Players present theories
7. **Voting** (3min) - Vote for suspected murderer, goal evaluation

### Dual Role System
Each player receives:
- **Murder Mystery Role**: Murderer (kill ability), Accomplice (information access), or Citizen (investigation)
- **Medieval Job**: King, Guard Captain, Merchant, Guild Receptionist, etc. (each with unique tasks and abilities)
- **Three Abilities**: One from role, one from job, one random

### Evidence System Architecture
- **Action Logging**: Comprehensive player action tracking using Minecraft's event system
- **Evidence Analysis**: Reliability scoring, temporal correlation, cross-reference validation
- **Evidence Distribution**: Post-incident evidence extraction and UI-based distribution to players

## Critical Implementation Details

### Game State Management
- Centralized state through GameManager singleton
- Immutable state updates with event-driven synchronization
- Phase-specific restrictions and permissions

### Timer System
- Precise timing (20 ticks = 1 second in Minecraft)
- Real-time countdown displays via ActionBar
- Automated phase transitions with manual override capability

### UI System (server-ui)
- Tutorial system with multi-page navigation
- Evidence presentation interfaces
- Role/job information displays
- Voting and ability activation forms

### Error Handling Strategy
- Comprehensive error recovery mechanisms
- User-friendly error messages via UI
- Graceful degradation when systems fail
- Extensive logging for debugging

## File Structure

```
MDMS/
├── src/                     # TypeScript source (minimal - most code in dist/)
├── dist/                    # Compiled JavaScript (primary codebase)
│   ├── scripts/src/
│   │   ├── managers/        # Core manager classes
│   │   ├── types/           # TypeScript type definitions
│   │   ├── constants/       # Game configuration and constants
│   │   └── utils/           # Utility functions
├── docs/                    # Comprehensive documentation
│   ├── detailed-design.md   # System design document
│   ├── system-architecture.md # Architecture overview
│   └── detailed-design/     # Component-specific documentation
├── scripts/                 # Build automation (ESM modules)
└── build/                   # Final .mcaddon package output
```

## Development Notes

### Current State
- Source TypeScript is minimal (`src/main.ts` only)
- Primary codebase exists as compiled JavaScript in `dist/`
- No existing tests or linting enforcement
- Mock action logger system (submodule dependency removed)

### Important Dependencies
- `@minecraft/server` v2.0.0 - Core Minecraft scripting API
- `@minecraft/server-ui` v2.0.0 - Player interface system
- Minecraft Bedrock Edition 1.20.0+ required

### Performance Considerations
- Evidence data compression for memory efficiency
- Batch processing for performance optimization
- Real-time update optimization for large player counts
- Timer precision management for smooth gameplay

### Extension Points
- Custom evidence types and analysis algorithms
- New player abilities and medieval jobs
- Phase timing and transition customization
- Evidence reliability scoring algorithms

## Game Balance & Design

The system implements complex game balance through:
- Multi-objective scoring (role goals + job goals + random objectives)
- Evidence reliability weighting based on source credibility
- Time-based evidence degradation
- Social interaction mechanics (trust, suspicion)
- Asymmetric information distribution

This architecture supports 4-20 player murder mystery games with sophisticated evidence systems, role-playing elements, and balanced competitive gameplay.