# Agents

## Beads (bd) — Work Tracking

Use MCP `beads` (bd) as our dependency‑aware issue tracker. Run
`beads/quickstart` to learn how to use it.

### Issue Types

- `bug` - Something broken that needs fixing
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature composed of multiple issues
- `chore` - Maintenance work (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (nice-to-have features, minor bugs)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Dependency Types

- `blocks` - Hard dependency (issue X blocks issue Y)
- `related` - Soft relationship (issues are connected)
- `parent-child` - Epic/subtask relationship
- `discovered-from` - Track issues discovered during work

Only `blocks` dependencies affect the ready work queue.

### Structured Fields and Labels

- Use issue `type` and `priority` fields.
- Use issue type "epic" and `parent-child` dependencies.
- Use `related` or `discovered-from` dependencies.
- Area pointers are labels, e.g.: `frontend`, `backend`

### Agent Workflow

If no issue is specified, run `bd ready` and claim an unblocked issue.

1. Open issue with `bd show <id>` and read all linked docs.
2. Assign to `agent`, update status as you work (`in_progress` → `closed`);
   maintain dependencies, and attach notes/links for traceability.
3. Discover new work? Create linked issue with dependency
   `discovered-from:<parent-id>`.
4. Land the change; run tests/lint; update any referenced docs.
5. Close the issue with `bd close <id>`.

## Coding Standards

- Use ECMAScript modules.
- Classes, interfaces, and factory types use `PascalCase`.
- Functions and methods use `camelCase`.
- Variables and parameters use `lower_snake_case`, unless they refer to a
  function or class.
- Constants are `UPPER_SNAKE_CASE`.
- File and directory names are `kebab-case`.
- Use `.js` files with JSDoc type annotations (TypeScript mode).
- Use `.ts` files only for interface definitions.
- Type only imports: `@import { X, Y, Z } from './file.js` in top-of-file JSDoc.
- Add JSDoc to all functions and methods with `@param` (and `@returns` for non
  trivial return types).
- Annotate local variables with `@type` blocks if their type is not obvious from
  the initializer.
- Use blocks for all control flow statements, even single-line bodies.
- Avoid runtime type checks, undefined/null checks and optional chaining
  operators (`?.`, `??`) unless strictly necessary.

## Unit Testing Standards

- Write short, focused test-case functions asserting one behavior each.
- Do not use "should" in test names; use verbs like "returns", "throws",
  "emits", or "calls"
- Structure: setup → execution → assertion (separate with blank lines).
- Never change implementation code to make tests pass.

## Pre‑Handoff Validation

- Run type checks: `npm run typecheck`
- Run tests: `npm test`
- Run eslint: `npm run lint`
- Run prettier: `npm run format`
