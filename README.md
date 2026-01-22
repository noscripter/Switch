# Switch

Chrome extensions Switch!

## Development

- Install dependencies: `yarn`
- Build both targets: `yarn build`
- Build MV3 only: `yarn build:mv3`
- Build MV2 only: `yarn build:mv2`
- Load the output folder in your browser:
  - MV3: `dist/mv3`
  - MV2: `dist/mv2`

## Structure

- `src/popup`: React + TypeScript popup UI
- `manifests`: MV2/MV3 manifest sources
- `public/images`: extension icons and images
- `scripts/build.mjs`: build orchestration for MV2/MV3
