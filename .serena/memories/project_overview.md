# MDMS Project Overview

MDMS (Murder Mystery Detective System) is a sophisticated Minecraft Bedrock Edition addon that implements a 7-phase murder mystery game in a fantasy medieval town setting.

## Purpose
Players take on dual roles (murderer/accomplice/citizen + medieval jobs like king/merchant/guard) and participate in evidence collection, investigation, and voting to identify the culprit in a structured 7-phase game system.

## Tech Stack
- **Platform**: Minecraft Bedrock Edition 1.20.0+
- **Language**: TypeScript (compiled to JavaScript)
- **Runtime**: Minecraft Script API (@minecraft/server v2.0.0, @minecraft/server-ui v2.0.0)
- **Build System**: TypeScript compiler + custom Node.js build scripts
- **Package Manager**: npm
- **Code Quality**: Biome.js for linting/formatting

## Key Dependencies
- `@minecraft/server` v2.0.0 - Core Minecraft scripting API
- `@minecraft/server-ui` v2.0.0 - Player interface system
- TypeScript v5.0.0+ for type safety
- Various build tools (archiver, rimraf, etc.)

## Game System
7-phase murder mystery game with:
1. Preparation (10min) - Role/job assignment, map exploration
2. Daily Life (15-20min) - 3 Minecraft days, job tasks, potential murder
3. Investigation (12min) - Evidence collection post-incident
4. Meeting (9min) - Discussion and information sharing
5. Re-investigation (9min) - Additional evidence gathering
6. Deduction (6min) - Players present theories
7. Voting (3min) - Vote for suspected murderer

Supports 4-20 players with dual role system and sophisticated evidence collection.