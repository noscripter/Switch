# Repository Guidelines

## Project Structure & Module Organization
- Source UI lives in `src/popup` (React + TypeScript). Shared browser helpers are in `src/shared`.
- Static assets (icons, placeholder images) are in `public/images`.
- Manifest sources are split by target: `manifests/manifest.mv2.json` and `manifests/manifest.mv3.json`.
- Build output is written to `dist/mv2` and `dist/mv3`.
- Legacy pre‑Vite files are preserved under `legacy/assets` for reference only.

## Build, Test, and Development Commands
- `yarn dev`: run Vite in MV3 mode for local popup development.
- `yarn build`: build both MV2 and MV3 bundles into `dist/`.
- `yarn build:mv2` / `yarn build:mv3`: build a single target.
- `yarn typecheck`: TypeScript type checking only.
- `yarn lint`: run ESLint on `src/`, `scripts/`, and `vite.config.ts`.
- `yarn format`: format all files with Prettier.

## Coding Style & Naming Conventions
- Use TypeScript for new code; React components use PascalCase (`App.tsx`).
- Prefer camelCase for functions/variables; keep file names lower case where possible.
- Styling is in SCSS (`src/popup/popup.scss`) and uses CSS variables for theme tokens.
- Formatting is enforced by Prettier (2‑space indent, double quotes, semicolons, 100‑char line width).

## Testing Guidelines
- No automated tests currently exist. If adding tests, prefer `src/**/__tests__` or `tests/` and name files `*.test.ts(x)`.
- At minimum, verify in both Firefox (MV2) and Chromium (MV3) by loading `dist/mv2` or `dist/mv3`.

## Commit & Pull Request Guidelines
- History favors Conventional Commits (`feat:`, `chore:`, `refactor:`), but some free‑form messages exist. New commits should follow Conventional Commits.
- PRs should describe user‑visible changes, include reproduction steps, and attach screenshots for UI updates.
- Keep MV2/MV3 parity: if you change UI or behavior, verify both manifests remain equivalent.

## Security & Configuration Tips
- This extension uses the `management` permission; avoid adding new permissions without justification.
- In MV2, CSP must allow `moz-extension:` image URLs for icons; preserve the existing CSP rules.
