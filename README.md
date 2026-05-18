# Map vs List

Een interactieve presentatie/demo van Team 418 die uitlegt wanneer je een `Map` of een `List` gebruikt in Java. Gebouwd als browser-based web component met Lit en Vite.

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

## Stack

- [Lit](https://lit.dev/) — web components
- [Vite](https://vitejs.dev/) — dev server en bundler
- Vanilla JS, geen framework, geen backend
