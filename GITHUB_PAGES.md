# GitHub Pages Deployment

This repo is ready to publish as a GitHub Pages site at:

https://vikash11004.github.io/portfolio/

## Required GitHub setting

In the repository on GitHub:

1. Open Settings.
2. Open Pages.
3. Under Build and deployment, set Source to GitHub Actions.
4. Save.

## Deployment flow

After that, every push to `main` will run the workflow in `.github/workflows/deploy-pages.yml` and publish the site.

## Notes

- `.nojekyll` is included so GitHub Pages serves the site without Jekyll processing.
- The site is a static SPA, so the root `index.html` is the entry point.
