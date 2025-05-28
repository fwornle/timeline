# Coding Memory - Timeline Project

## Redux Serialization Issue and Solution

### Problem
- **Issue**: Three.js Vector3 objects are not serializable
- **Context**: Redux requires all state to be serializable for DevTools and persistence
- **Impact**: Direct storage of Vector3 objects in Redux store caused errors
- **Affected Areas**: Camera position and marker position state management

### Solution
- **Approach**: Convert Three.js Vector3 objects to plain JavaScript objects
- **Implementation**: 
  - Before Redux storage: Convert Vector3 to `{x: number, y: number, z: number}`
  - When using in Three.js: Reconstruct Vector3 from plain object
- **Benefits**:
  - Redux DevTools work properly
  - State can be persisted to localStorage
  - No serialization errors
  
### Code Pattern
```typescript
// Storing in Redux
const plainPosition = {
  x: vector3.x,
  y: vector3.y,
  z: vector3.z
};

// Reconstructing for Three.js
const vector3 = new THREE.Vector3(
  plainPosition.x,
  plainPosition.y,
  plainPosition.z
);
```

### Files Affected
- `src/store/intents/uiIntents.ts` - Camera state management
- `src/store/slices/uiSlice.ts` - Redux slice with serializable state
- `src/components/three/TimelineCamera.tsx` - Camera component handling
- `src/services/storage.ts` - Persistence layer

---

## How to Use Knowledge Graph Memory in Claude Code

Once the MCP server is active in a new session, you can:

1. **Store Information**:
   ```
   "Remember that [specific solution/pattern/approach]"
   ```

2. **Retrieve Information**:
   ```
   "What do you remember about [topic/project/problem]?"
   ```

3. **Connect Concepts**:
   ```
   "This solution is related to [other concept]"
   ```

### Memory Management Commands

- **View memory file**: `cat ~/claude-coding-memory.json | jq .`
- **Backup memory**: `cp ~/claude-coding-memory.json ~/claude-coding-memory.backup.json`
- **Clear memory**: `rm ~/claude-coding-memory.json`
- **Remove MCP server**: `claude mcp remove memory`
- **Re-add with custom path**: 
  ```bash
  claude mcp add-json memory '{"command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"], "env": {"MEMORY_FILE_PATH": "/Users/q284340/claude-coding-memory.json"}}'
  ```