# Vendored Cypress AI skills

Source: <https://github.com/cypress-io/ai-toolkit>
Pinned commit: `5258ece52a0010d268946e08606c98784c98f255`
License: MIT (see `LICENSE` in this directory)

Vendored on 2026-11-04:

- `cypress-author` 1.0.1
- `cypress-explain` 1.0.1
- `cypress-docs` 1.0.0
- `cypress-tap` 1.1.0

`cypress-cloud-cli` is intentionally not vendored: it requires a Cypress Cloud
organisation, an authenticated CLI, and a Cloud integration that this project
does not have.

## Updating

The `skills` CLI update check does not track manually vendored copies. To
update:

1. Clone `cypress-io/ai-toolkit` and pick a new commit.
2. Replace the skill directories wholesale; do not hand-edit upstream files.
3. Update the commit and versions above.
4. Review the diff and run the e2e suite.
