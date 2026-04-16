# Offline Deployment Requirements

This document lists everything you must download and prepare while connected to the internet, so that the web application can run completely offline.

## 1. System Software (Backend & Hosting)
Download the installers for these on a USB stick or transfer them to the offline machine:
*   **[Node.js](https://nodejs.org/en/download/)** - Required to run the application (both frontend Vite build and the Express backend).
*   **[PostgreSQL](https://www.postgresql.org/download/windows/)** - The database system you are currently using.

## 2. Frontend Assets & Libraries
If you do not want to change any code, you will need a proxy or you must rely heavily on caching. However, for a true offline deployment, you should download these and point your code to them:
*   **Tailwind CSS:** Standalone CLI executable (if not using Node to build).
*   **React & React-DOM:** Downloaded automatically via `npm install` (requires moving the `node_modules` folder to the offline machine).
*   **Leaflet.js:** Download the JS, CSS, and Marker icons from [Leaflet's official site](https://leafletjs.com/download.html).

## 3. Map Data (Crucial for offline mapping)
*   **Map Tiles File (`.mbtiles`):** Download your required map area (e.g., Israel) from [OpenMapTiles / MapTiler](https://data.maptiler.com/downloads/tileset/osm/asia/israel/).
*   **Tile Server:** Download [TileServer-GL](https://github.com/maptiler/tileserver-gl) or a similar offline tile host. (If your offline machine supports Docker, download the Docker image: `docker pull maptiler/tileserver-gl` and save it to a `.tar` archive).

## 4. Fonts
*   **Heebo Font:** Go to the [Google Webfonts Helper tool](https://gwfh.mranftl.com/fonts/heebo?subsets=hebrew,latin), select the Heebo font, and download the `.zip` containing the offline font files (`.woff2`).

## 5. Google GenAI (Important Limitation)
*   Your project utilizes `@google/genai`. **This cannot be downloaded.** 
*   *Requirement:* You must either disable AI features in the offline version or substitute it with a locally hosted Large Language Model (LLM) using software like [Ollama](https://ollama.com/) combined with a model like Llama-3.

## Deployment Checklist for Offline Machine:
- [ ] Install PostgreSQL and create the `mission_db` database.
- [ ] Install Node.js.
- [ ] Transfer the entire project folder (including `node_modules` so you don't need `npm install` online).
- [ ] Start the map Tile Server hosting your downloaded `.mbtiles`.
- [ ] Place the `.woff2` font files and Leaflet marker `.png` files inside your `public` folder.
- [ ] Run `npm run build` (if deploying for production) or `npm run dev` to serve the application locally.
