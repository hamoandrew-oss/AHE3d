# AH Terra Viewer

A mobile-first HTML/PWA viewer for DJI Terra 3D Tiles (`tileset.json` + `.b3dm`) models.

## Use
1. Upload this folder to any HTTPS static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).
2. Upload each full DJI Terra 3D Tiles export to a web-accessible location.
3. In the app, tap **Add project** and paste the URL ending in `tileset.json`.
4. On iPhone Safari, use **Share → Add to Home Screen** for an app-like experience.

## Important hosting requirement
The host serving the DJI Terra model must allow browser CORS requests. Keep the original relative folder structure intact so `tileset.json` can find every `.b3dm` tile.

## Notes
- Projects and settings are stored locally in the browser using `localStorage`.
- The CesiumJS viewer is loaded from jsDelivr, so the first launch needs an internet connection.
- This starter app does not upload DJI Terra folders directly from iPhone; it views hosted 3D Tiles datasets by URL.
