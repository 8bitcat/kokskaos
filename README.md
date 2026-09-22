# Kökskaos 🍳

Kaotiskt, fysikbaserat restaurangkök i 3D för 1–9 kockar (en värd + upp till 8 som går med via en fyrbokstavskod).
Allt i köket är fysik: du har två händer (vänster/höger musknapp) och drar, lyfter, vrider, häller, hackar och kastar.
Ren statisk webbsida – ingen byggkedja, ingen server (WebRTC via PeerJS).

## Köra lokalt

```bash
node tools/serve.mjs 8123        # http://localhost:8123
```

URL-parametrar: `?lang=sv|en`, `?join=KOD`, `?rest=dump|bistro|grand|star`, `?cheat=1` (max nivå/pengar – för test),
`?test=solo|host|join` (hoppar över menyn, exponerar `window.game`).

## Spelet i korthet

- **Karriär:** fyra restauranger – *Sunkhaket* (sprickor, blinkande lysrör, trasig fritös) → *Kvarterskrogen* →
  *Storköket* → *Stjärnkrogen*. Stjärnor från serveringar låser upp nästa krog, XP ger kocknivåer som låser upp rätter
  (36 st), pengar köper renoveringar/uppgraderingar per restaurang samt hattar, kläder, förkläden, ansikten och emotes.
  Sparas per spelare i `localStorage` (`kokskaos.profile.v1`); alla i köket får XP/pengar/stjärnor för ett pass.
- **Matlagning:** spisvred, ugnsluckor, fritöser med korgar, kranar, mixer, lådor och kylskåp är ledade fysikkroppar.
  Stekning per sida, kokning (vatten från kran eller måttkanna, lock kokar snabbare), fritering, ugn; kniv hackar,
  potatisstöt mosar, köttklubba plattar schnitzel, kavel plattar pizzadeg, rivjärn river ost, flaskor sprutar,
  ugnen smälter ihop pizzabotten + sås + ost till pizza, smet blir pannkaka i het panna, ägg spricker.
- **Servering:** dra i spaken vid luckan → beställningar. Ställ tallriken på luckan; rätt innehåll ⇒ servitör hämtar.
  Skylten över tallriken säger vad som saknas (rå / bränd / fel tillagning). Gäster blir argare ju längre de väntar.
- **Kockens anteckningar (Tab):** en handskriven receptbok med foton ur spelet (`img/recipes`, `img/howto`,
  genererade av `tools/photos.mjs`), steg-för-steg-instruktioner som genereras ur receptdata (`js/cookbook.js`)
  och klotter/post-it-lappar från `js/cookbook_text.js`. Samma lappar sitter på väggarna, plus en menytavla vid luckan.
- **Beställa råvaror:** lyft luren på den röda väggtelefonen vid LEVERANS-rutan (eller pausmenyn) → beställningsmeny
  (`js/supplier.js`). Värden tar betalt ur kassan under servering (gratis i fri lek) och släpper en `deliverycrate`
  med råvarorna på rutan; tomma lådor försvinner av sig själva.
- **Vred:** vrids bara medsols mellan AV och MAX (lägesstyrd motor, går inte runt). Bilden bakom vredet visar
  gult→rött med flammor. Siktar man på ett vred visar tipsrutan vad det styr, AV/PÅ % och hur man vrider.
- **Version:** `VERSION`/`BUILD` i `js/config.js` visas i startmenyn, pausmenyn och i spelet. Höj den vid varje
  publicering så att man ser vilken version man spelar.
- **Grepp:** verktyg snäpper till ett vettigt grepp när man tar dem (`grip`/`hold` i föremålsdatan): knivar och
  spadar pekar framåt, pannor hänger i handtaget, tallrikar/grytor rätas upp. Handen ligger `reach` meter rakt fram
  och blicken styr höjden – att titta ner snabbt är alltså ett rakt hugg.

## Kod

| Fil | Roll |
|---|---|
| `js/main.js` | boot, meny, spel-loop, värd/klient-limning, karriärkreditering |
| `js/sim.js` | **endast värden**: Rapier-värld, föremål, fixturer, händer, värme/tillagning, verktyg, påfyllning |
| `js/orders.js` | recept (tier/nivå), bedömning av tallrikar, servering, servitörer |
| `js/restaurants.js` | de fyra restaurangerna: rum, tema, layout-spec, uppgraderingar, svårighet |
| `js/kitchen.js` | bygger en restaurang ur beskrivningen (batchad statisk geometri + kolliderare + fixturer) |
| `js/items.js`, `items_utensils.js`, `items_food.js`, `itemkit.js` | datadrivna föremål: kolliderare + visuella delar |
| `js/view.js`, `fx.js`, `avatars.js` | rendering, interpolation, partiklar, kockar/servitörer/gäster, kosmetik, emotes |
| `js/player.js` | lokal spelare: pekarlås, rörelse (Rapier character controller mot statisk geometri), händer |
| `js/net.js` | PeerJS, binära snapshots (16 B/kropp) + JSON-händelser |
| `js/profile.js`, `meta.js` | sparfil, nivåer, prestationer; meny-UI för restauranger, butik, garderob med 3D-förhandsvisning |
| `js/hud.js`, `i18n.js`, `audio.js` | HUD, texter (sv/en), syntetiserat ljud (WebAudio) |

Nätmodell: värden simulerar all fysik i 60 Hz och skickar snapshots i 20 Hz; klienter skickar position + händer i 30 Hz
(egen rörelse är klientauktoritativ mot statisk geometri). Fixtur-id:n är deterministiska – värd och klient bygger
samma kök ur (restaurang, uppgraderingar) som skickas i `welcome`.

## Test (headless Chromium via Playwright)

```bash
export PW_DIR=<mapp med node_modules/playwright>
node tools/shot.mjs <utmapp> tools/t_grab.mjs     # grepp, ugnslucka, vred
node tools/shot.mjs <utmapp> tools/t_cook.mjs     # stekning, fritös, kran
node tools/shot.mjs <utmapp> tools/t_cut3.mjs     # hacka potatis
node tools/shot.mjs <utmapp> tools/t_order.mjs    # spak → beställning → servitör → betalt
node tools/mp.mjs <utmapp>                        # värd + klient över riktig WebRTC
```
