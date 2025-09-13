# Task Completion Checklist

## When Task is Completed

### Build Verification
1. Run `npm run compile` to ensure TypeScript compilation succeeds
2. Run `npm run build` to verify full build pipeline works
3. Check that `.mcaddon` file is generated properly

### Code Quality Checks
Currently no explicit linting commands are defined in package.json, but Biome.js is configured:
- Check biome.json configuration for any specific linting requirements
- Ensure code follows the established conventions (2-space indentation, double quotes, etc.)

### Testing
⚠️ **No formal testing framework is currently set up**
- Manual testing in Minecraft Bedrock Edition environment required
- Verify game phases work correctly
- Test manager interactions and UI systems

### File Structure Verification
- Ensure new files are in appropriate directories (`src/managers/`, `src/types/`, etc.)
- Verify imports follow the established patterns
- Check that new managers follow the interface patterns

### Documentation
- Update relevant comments in Japanese where appropriate
- Ensure TypeScript types are properly defined
- Update any configuration files if new dependencies are added

## Deployment Notes
- The final `.mcaddon` file should be importable into Minecraft Bedrock Edition
- Requires Minecraft 1.20.0+ and experimental features enabled
- Test in a dedicated Minecraft world with the addon enabled