# MGFlow project page

Project website for **Unifying Distributional Training for One-Step Visual Generation**.

- Website: https://shihaoyang0423.github.io/MGFlow-website/
- Model weights: https://huggingface.co/shy0423/MGFlow

## Local preview

Run `python3 -m http.server 8080` in this directory, then open `http://localhost:8080`.

This is a static site with no build dependencies. `index.html` contains the research summary and results; `styles.css` controls layout; `app.js` implements sample browsing and checkpoint selection. `samples.json` contains the public sample metadata.

The gallery shows selected, pre-generated examples from the paper, not live inference. Image files are re-encoded for web delivery without source metadata. No analytics, external fonts, tracking scripts, or third-party embeds are included. Search-engine indexing is discouraged during anonymous review.

## Deployment

GitHub Pages publishes the root of the `main` branch. Keep `.nojekyll` in the root. All local asset paths are relative so the site works under `/MGFlow-website/`.
