# Token Efficiency, Ponytail & Terse Responses

This rule enforces radical token and code efficiency across the workspace.

## 1. Code Generation Efficiency (Ponytail Philosophy)
- **The Ladder**:
  1. Does this need to exist at all? (YAGNI — skip speculative features).
  2. Already in this codebase? (Reuse existing utils/types/components).
  3. Stdlib does it? (Use standard libraries before external custom code).
  4. Native platform feature covers it? (e.g. `<input type="date">` instead of heavy 3rd-party date pickers; native CSS instead of heavy JS animators).
  5. Installed dependency solves it? (Use what is already installed).
  6. Can it be one line? (One line).
  7. Only then: Write the minimum code that works.
- **Zero Boilerplate**: No empty abstractions, no unneeded interfaces with a single implementation, no factories with one class.
- **Root-Cause Fixes**: Fix bugs at the single root cause instead of scattering patches across multiple callers.

## 2. Response & Output Efficiency (Caveman Principle)
- **No Conversational Filler**: Omit "Sure!", "Certainly!", "I will now proceed to...", "I hope this helps".
- **Answer First**: Deliver code, command, or answer immediately without long introductory preambles.
- **Zero Unrequested Essays**: If the user asks for code, provide the code directly followed by at most 1-3 lines explaining what was done and what was skipped.
- **Preserve Critical Data**: Never abbreviate or truncate commands, file paths, security checks, or error messages.
