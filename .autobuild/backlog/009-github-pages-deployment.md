---
id: "009"
title: GitHub Pages deployment
---
Add a GitHub Actions workflow that builds and publishes the app to GitHub Pages at https://arienkock.github.io/klokkie-dokkie/.

The Vite config should support a configurable base URL via the `VITE_BASE_URL` environment variable, defaulting to `/` for local development. During the CI build, the base should be set to `/klokkie-dokkie/` so that all asset URLs resolve correctly under that path.

The workflow should trigger on pushes to `main` and support manual dispatch. It should install dependencies, run the Vite build, then publish the `dist` output using the official GitHub Pages Actions (`upload-pages-artifact` and `deploy-pages`).

Add a `build` script to `package.json` that runs `vite build`.
