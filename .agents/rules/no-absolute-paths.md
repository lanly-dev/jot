# Rule: No Absolute Paths in Project Files

## Context
When writing code, documentation, markdown files, configuration, or test scripts in this repository, absolute paths (such as `file:///c:/...`, `C:\Users\...`, `c:/Users/...`, `/home/...`, or drive letters) must NEVER be written or committed into project files.

Absolute paths leak personal environment paths and break links when the project is cloned, deployed, or run on another machine, Docker container, or OS.

## Requirements
1. **Repository Files**:
   - Always use repository-relative paths inside documentation, markdown files, comments, and code.
   - Example (Markdown links): Use `[scripts/](scripts/)` or `[docs/plans/](docs/plans/)`, NOT `file:///c:/Users/...`.
   - Example (Code imports / file operations): Use `path.join(__dirname, ...)` or relative paths like `./data/notes.json`, NOT hardcoded absolute machine paths.
2. **Chat Responses vs Repository Files**:
   - While the AI assistant may use clickable `file:///` links in direct chat responses to the user, it must NEVER write `file:///` or machine-specific absolute paths into files saved to disk in the project.
