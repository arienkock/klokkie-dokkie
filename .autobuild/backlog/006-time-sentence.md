---
id: "006"
title: Dutch time-sentence representation
variation_instructions:
 - "IMPORTANT: Implement from the inside out. Use the wishful programming approach. Write the internal code you wish you had, before you write the code that uses it."
---

## Doel

Voeg een derde tijdsrepresentatie toe: een **Nederlandse tijdszin**. Net als de analoge en digitale klok toont de tijdszin dezelfde tijd, maar dan als een uitgesproken zin zoals "kwart over drie" of "tien voor half acht".

---

## Tijdszin-component

De component zet een `{ hour, minute }` tijd om in de correcte Nederlandse tijdsuitdrukking. Gebruik de gangbare Nederlandse conventies:

| Minuten | Patroon (voorbeeld voor uur H) |
|---------|-------------------------------|
| 0 | `<uur> uur` |
| 1–4 | `<N> over <uur>` |
| 5 | `vijf over <uur>` |
| 10 | `tien over <uur>` |
| 15 | `kwart over <uur>` |
| 20 | `tien voor half <uur+1>` |
| 25 | `vijf voor half <uur+1>` |
| 30 | `half <uur+1>` |
| 35 | `vijf over half <uur+1>` |
| 40 | `tien over half <uur+1>` |
| 45 | `kwart voor <uur+1>` |
| 50 | `tien voor <uur+1>` |
| 55 | `vijf voor <uur+1>` |

Uurwoorden (12-uurs, lowercase): één, twee, drie, vier, vijf, zes, zeven, acht, negen, tien, elf, twaalf. Bij 24-uurs tijden: reduceer eerst het uur modulo 12 (waarbij 0 → twaalf) voordat je de zin bouwt — de tijdszin is altijd 12-uurs van aard.

---

## Bewerkbare modus (invulzin)

Wanneer de tijdszin bewerkbaar is, vervangt de gewone zin een **invulzin**: een reeks woord-placeholders met lege slots, aangevuld met een **woordentray** eronder.

### Woordentray
- Bevat de **correcte woorden** die de zin vormen (in willekeurige volgorde).
- Bevat daarnaast een **beperkt aantal confounders** — plausibele maar foutieve woorden (bijv. een ander uurwoord, een verkeerd tussenwoord als "voor" i.p.v. "over").
- Het totale aantal confounders is tussen de 2 en 4, afhankelijk van de zinlengte.
- Confounders worden willekeurig gekozen uit het vocabulaire maar mogen niet gelijk zijn aan een correct woord.

### Interactie
- Blokken in de tray zijn **drag-and-drop** naar een leeg slot in de zin.
- Blokken in de zin zijn terug naar de tray te slepen.
- **Dubbelklik** op een tray-blok plaatst het in het **eerste lege slot** van links.
- **Dubbelklik** op een geplaatst blok in de zin verwijdert het en zet het terug in de tray.
- Zodra alle slots zijn ingevuld, wordt direct gecontroleerd of de zin klopt. Correcte invulling = antwoord goed (zelfde logica als bij de andere componenten). Foute invulling = visuele feedback, zin reset naar leeg (blokken terug in tray).

---

## Menu-uitbreiding

Het keuzemenu bij het starten van een spel krijgt een **derde optie**: naast "Analoog" en "Digitaal" komt nu ook **"Zin"**.

De gekozen representatie is de **bewerkbare** component. De **vaste** (vraag-)component wordt willekeurig gekozen uit de overige twee representaties. Concrete pairings per keuze:

| Keuze speler | Vaste component (random) |
|---|---|
| Analoog | Digitaal **of** Zin |
| Digitaal | Analoog **of** Zin |
| Zin | Analoog **of** Digitaal |

"Beide" (de huidige optie) blijft bestaan en koppelt Analoog ↔ Digitaal zoals nu, met "Zin" als mogelijke derde partner: bij "Beide" wordt willekeurig een van de drie pairings (Analoog↔Digitaal, Analoog↔Zin, Digitaal↔Zin) gekozen per ronde, waarbij één van de twee willekeurig bewerkbaar is.

---

## Overige eisen

- De tijdszin-component volgt exact hetzelfde patroon als de klokcomponenten: neemt een tijd aan, toont die, en heeft een bewerkbare en een alleen-lezen modus.
- Matching-logica: de zin wordt als correct beschouwd als de uitgedrukte 12-uurs tijd overeenkomt met de doeltijd (inclusief AM/PM-ambiguïteit voor analoog, net als nu).
- Alle moeilijkheidsgraden uit taak 004 en 005 werken ook met de tijdszin (de gegenereerde tijd wordt al door die lagen bepaald; de zin-component consumeert gewoon de uitkomst).
- UI-taal: Nederlands.
- Gebruik de centrale state store; geen externe libraries.
- Responsief, minimaal, strak raster — consistent met de bestaande UI.
- Geen documentatie of comments. Alleen de code.
- Tests: voeg placeholder-tests toe voor de tijdszin-logica (omzetting van tijd naar zin) die draaien via `npm run test`.
