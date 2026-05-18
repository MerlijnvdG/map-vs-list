# Map vs List

Een interactieve presentatie/demo voor Team 418 die uitlegt wanneer je een `Map` of een `List` gebruikt in Java. Gebouwd als browser-based web component met Lit en Vite.

## Wat zit erin

- Uitleg over wat een List en Map zijn, met Java codevoorbeelden
- Overzicht van wanneer je wat gebruikt, met concrete voorbeelden
- Overzicht van implementaties (ArrayList, LinkedList, HashMap, LinkedHashMap, TreeMap)
- Drie interactieve quizvragen waarbij je raadt welke datastructuur sneller is
- Live benchmarks die in de browser draaien (geen backend nodig)
- Big O groeigrafiek die het verschil tussen O(1) en O(n) visualiseert
- Bronnen

## Aan de slag

Zorg dat je [Node.js](https://nodejs.org/) hebt geïnstalleerd, dan:

```bash
cd demo
npm install
npm run dev
```

Open daarna de URL die Vite toont in je browser (standaard `http://localhost:5173`).

## Bouwen voor productie

```bash
cd demo
npm run build
```

De gebouwde bestanden staan in `demo/dist/`.

## Navigeren

| Actie | Knop |
|---|---|
| Volgende slide | Volgende / pijltje rechts |
| Vorige slide | Vorige / pijltje links |
| Sectie springen | Knoppen bovenin de navigatiebalk |

## Stack

- [Lit](https://lit.dev/) — web components
- [Vite](https://vitejs.dev/) — dev server en bundler
- Vanilla JS, geen framework, geen backend
