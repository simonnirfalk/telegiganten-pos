# Telegiganten POS

Et performanceoptimeret, touch-venligt Point-of-Sale-system udviklet til Telegiganten – med fokus på reparationer, lagerstyring og kundeoplysninger.

## 🚀 Funktioner

- Trinbaseret oprettelse af reparationer (Vælg enhed → Vælg reparation → Kunde → Bekræft)
- Touch-optimeret dashboard til butik (iPad/desktop)
- Seneste reparationer vises i overskueligt format
- Integreret statistik og analyser med grafer og live-filtrering
- Forberedt til integration med:
  - Google Sheets (reservedelslager)
  - SMS API
  - Eksisterende WordPress-bookingsystem

## 🧑‍💻 Teknologier

- [React](https://react.dev/) + [Vite](https://vitejs.dev/) – frontend framework
- [Recharts](https://recharts.org/) – datavisualisering
- [React Router](https://reactrouter.com/) – navigation
- Google Fonts (Archivo Black & Inter)
- Git + GitHub til versionsstyring og backup

## ⚙️ Installation

1. Klon projektet:

```bash
git clone https://github.com/simonnirfalk/telegiganten-pos.git
cd telegiganten-pos
Installer afhængigheder:

bash
Kopiér
Rediger
npm install
Start udviklingsserver:

bash
Kopiér
Rediger
npm run dev
Åbn http://localhost:5173 i din browser.

📁 Projektstruktur
css
Kopiér
Rediger
src/
├── components/          → UI-komponenter (eks. DashboardStats)
├── pages/               → Overordnede views (Dashboard osv.)
├── App.jsx              → Main layout + routing
├── main.jsx             → Root React entry
├── index.css            → Global styling
public/
├── logo.png             → Telegigantens logo
📊 Kommende funktioner
Databaseintegration (MySQL)

Live-reparationstracking

Lagertræk ved reparationer

Brugerlogin og adgangskontrol

Integration med bookingsystem og SMS

👤 Udviklet af
Simon Nirfalk
github.com/simonnirfalk
