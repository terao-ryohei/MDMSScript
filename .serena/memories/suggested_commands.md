# Suggested Commands for MDMS Development

## Build & Development Commands
- `npm run build` - Full production build (TypeScript → JS → .mcaddon → .zip)
- `npm run watch` - Continuous TypeScript compilation during development  
- `npm run clean` - Remove dist directory
- `npm run compile` - TypeScript compilation only

## Build Pipeline Details
The build process runs in sequence:
1. `tsc -p tsconfig.json` - TypeScript compilation to JavaScript
2. `node scripts/build.mjs` - Copy files to dist structure
3. `node scripts/makeMcaddon.mjs` - Package as .mcaddon for Minecraft
4. `node scripts/makeZip.mjs` - Create final distribution zip

## Development Workflow
1. Use `npm run watch` during active development for continuous compilation
2. Use `npm run build` to create final distribution files
3. The `.mcaddon` file can be imported directly into Minecraft Bedrock Edition

## Code Quality
- Biome.js is configured for linting and formatting
- No explicit lint/format commands defined in package.json - check biome.json for configuration
- TypeScript strict mode is enabled

## System Commands (Linux)
Standard Linux commands available: `git`, `ls`, `cd`, `grep`, `find`, `cat`, `head`, `tail`, etc.