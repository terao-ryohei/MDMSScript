# MDMS System Architecture

## Manager-Based Architecture Pattern
The codebase follows a sophisticated manager-based architecture with clear separation of concerns. Each manager implements well-defined interfaces and handles specific game subsystems.

## Core Managers (src/managers/)
- **ScoreboardManager** - Centralized game state using Minecraft scoreboards for persistence
- **PhaseManager** - 7-phase game progression with timer-based transitions
- **EvidenceAnalyzer** & **EvidenceUIManager** - Evidence collection, reliability scoring, correlation analysis
- **RoleAssignmentManager** & **JobAssignmentManager** - Dual role system (murder mystery roles + medieval jobs)
- **RoleUIManager** & **OccupationUIManager** - Player interface management
- **VotingManager** & **VotingUIManager** - Voting system with UI
- **AbilityManager** & **AbilityUIManager** - Player abilities and power system
- **AdminManager** & **AdminUIManager** - Administrative controls
- **ActionTrackingManager** - Player action logging for evidence
- **ScoringManager** - Game scoring and victory conditions
- **NPCManager** - NPC interaction system
- **BGMManager** - Background music management
- **UIManager** - Main UI coordination

## Key Design Patterns
- **Singleton**: GameManager pattern for single game instance
- **Observer**: Event-driven architecture using Minecraft's ScriptEvent system
- **Manager Pattern**: Each system component isolated in dedicated managers
- **Interface Segregation**: IUIManager and other focused interfaces

## Type System Organization (src/types/)
Comprehensive TypeScript type definitions:
- **GameTypes** - Core game state, configuration, player states
- **RoleTypes** - Murder mystery roles (murderer, accomplice, citizen) 
- **JobTypes** - Fantasy medieval jobs with unique abilities
- **PhaseTypes** - Game phase definitions and transitions
- **AbilityTypes** - Player abilities and power system
- **VotingTypes** - Voting system types
- **ScoringTypes** - Scoring and victory condition types
- **AudioTypes** - BGM and sound system types

## Data Persistence Strategy
- **Scoreboard-based**: Uses Minecraft's built-in scoreboard system for persistent game state
- **Objective mapping**: Detailed mapping system for different game states and player data
- **Real-time updates**: Immediate persistence of all game state changes