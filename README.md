# Klokkie-Dokkie

## [▶ Open de app](https://arienkock.github.io/klokkie-dokkie/)

Een interactieve webapp om klok lezen te oefenen. Bedoeld voor leerlingen die leren klokkijken in het Nederlands.

## Wat doet het?

De app biedt oefensessies van ongeveer 20 vragen in drie verschillende weergaven:

- **Analoge klok** – versleep de wijzers naar de juiste stand
- **Digitale klok** – stel uren en minuten in met pijltjesknopjes
- **Zinnen** – rangschik Nederlandse woorden tot een correcte tijdzin (bijv. "kwart over twee")

Je kiest zelf welke weergaven je wilt oefenen (minstens twee). De
moeilijkheidsgraad past zich daarna volledig automatisch aan: het spel mikt op
zo'n 80% goede antwoorden en maakt kleine stapjes omhoog of omlaag, per
weergave apart.

## Niveaus

De niveaus vormen een ladder waarbij elke trede precies één nieuw begrip
introduceert:

| Niveau | Begrip |
|--------|--------|
| 1 | Hele uren ("twee uur") |
| 2 | Halve uren ("half drie") |
| 3 | Kwartieren ("kwart over / kwart voor") |
| 4 | 24-uurs klok aflezen (alleen digitaal, bijv. 14:30) |
| 5 | Vijf minuten vóór half ("vijf over", "tien voor half") |
| 6 | Vijf minuten ná half ("vijf over half", "tien voor") |
| 7 | Elke minuut |

De voortgang per weergave wordt bewaard, zodat je later verdergaat waar je was
gebleven. Als je een nieuw niveau beheerst, wordt dat gevierd. 🎉

Meer detail over het adaptieve systeem staat in
[docs/adaptive-difficulty.md](docs/adaptive-difficulty.md).

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
