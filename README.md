# Klokkie-Dokkie

Een interactieve webapp om klok lezen te oefenen. Bedoeld voor leerlingen die leren klokkijken in het Nederlands.

## Wat doet het?

De app biedt oefensessies van 20 vragen in drie verschillende weergaven:

- **Analoge klok** – versleep de wijzers naar de juiste stand
- **Digitale klok** – stel uren en minuten in met pijltjesknopjes
- **Zinnen** – rangschik Nederlandse woorden tot een correcte tijdzin (bijv. "kwart over twee")

De moeilijkheidsgraad past zich automatisch aan op basis van je prestaties.

## Moeilijkheidsgraden

| Niveau | Nauwkeurigheid |
|--------|---------------|
| 1 | Alleen hele uren |
| 2 | Veelvouden van 5 tot 30 minuten |
| 3 | Alle veelvouden van 5 minuten |
| 4 | Elke minuut |

Een oefenmodus wordt als afgerond gemarkeerd wanneer je 90% of meer scoort.

## Aan de slag

Vereisten: [Node.js](https://nodejs.org/)

```bash
cd src
npm install
npm run dev
```

De app is dan bereikbaar op `http://localhost:5173`.

## Beschikbare commando's

```bash
npm run dev      # Start de ontwikkelserver
npm run build    # Maak een productiebuild in dist/
npm run test     # Voer alle tests uit
```

## Techniek

- Vanilla JavaScript met Web Components
- [Vite](https://vitejs.dev/) als bouwgereedschap
- [Vitest](https://vitest.dev/) voor tests
- [Shoelace](https://shoelace.style/) UI-componenten
- Voortgang opgeslagen in `localStorage`

## Uitrol

De app wordt automatisch uitgerold naar GitHub Pages bij elke push naar de `master`-branch.
