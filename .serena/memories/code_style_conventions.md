# Code Style and Conventions

## TypeScript Configuration
- **Target**: ESNext
- **Module**: ESNext with Node resolution
- **Strict mode**: Enabled
- **Output**: `./dist/scripts` directory
- **Base URL**: Project root with path mapping for @minecraft/*

## Code Formatting (Biome.js)
- **Indentation**: 2 spaces (both TS and CSS)
- **Quote style**: Double quotes for JavaScript/TypeScript
- **Organize imports**: Enabled
- **CSS modules**: Supported

## Linting Rules
- Recommended rules enabled
- Unused imports/variables: Warning level
- Sorted classes: Warning (nursery rule)

## Naming Conventions
Based on code examination:
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `GAME_OBJECTIVES`, `ROLE_IDS`)
- **Functions**: camelCase (e.g., `initializeGame`, `showMainUIMenu`)
- **Managers**: PascalCase classes (e.g., `PhaseManager`, `ScoreboardManager`)
- **Types/Interfaces**: PascalCase (e.g., `RoleType`, `IUIManager`)

## File Organization
- **Types**: Located in `src/types/` with descriptive names ending in `Types.ts`
- **Managers**: Located in `src/managers/` with business logic
- **Constants**: Located in `src/constants/` for configuration data
- **Data**: Located in `src/data/` for game definitions

## Documentation
- Japanese comments and JSDoc where appropriate
- Comprehensive type definitions for all game systems