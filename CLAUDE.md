# WishsiteApp (React Native / Expo)

## Projektkontext

Diese App ist das mobile Pendant zur Rails-Webanwendung **wishsite3**
(`/Users/markus/Documents/GitHub/wishsite3`, Sibling-Repo), die gleichzeitig als
Backend dient (`/api/v1/...`). Leitprinzip für alle Styling- und Feature-Arbeiten:
**so nah wie möglich am Web-Original**, sowohl optisch (Farben, Radien, Abstände,
Icons) als auch funktional (jede Web-Funktion soll auch in der App vorhanden sein,
sofern sinnvoll auf Mobile übertragbar).

## Backend: wishsite3

- **Aktiver Branch ist `react`, NICHT `main`.** Auf `main` fehlen sämtliche
  `api/v1`-Controller (nur `buttons_controller.rb`/`bookmarklets_controller.rb`
  existieren dort) — die App bricht dann komplett. Vor jeder Backend-Änderung
  `git branch --show-current` in wishsite3 prüfen.
- Rails-Dev-Server läuft lokal auf `localhost:3000`.
- Bevor eine Funktion in der App nachgebaut wird, die tatsächliche Web-Quelle
  verifizieren (View-Partial + Controller + ggf. Model-Spalte). **Nicht raten.**
  Lehrbeispiel: eine frühere Session nahm an, `shortlink` sei ein
  Boolean-Feld auf `Wishlist` und baute einen Toggle-Mechanismus dafür — das
  Feld existierte nie, der echte "Kurzlink" wird im Web nur zur Laufzeit als
  `"wsite.to/#{access_key}"` zusammengesetzt (`_shortlink.html.erb`). Führte zu
  einem 500er, der die komplette Item-Liste in der App leerte.
- API-Routen für `background_image`/`user_image` nutzen bewusst
  `scope '/wishlists/:id'` statt Rails' verschachteltem `resources do end`,
  damit `params[:id]` (wie im Web-Controller) statt `params[:wishlist_id]`
  ankommt.

## Icons

- `src/styles/icons.js` enthält alle Icons als Farb-parametrisierte
  Template-Strings (`(color) => \`<svg>...\`\``), gerendert über `<SvgXml>`
  aus `react-native-svg`. Kein Metro-SVG-Transformer konfiguriert — Icons
  NICHT als `.svg`-Dateien importieren.
- Beim Portieren/Aktualisieren eines Icons: `viewBox` und `d`-Pfade **exakt**
  aus der aktuellen `wishsite3/app/assets/images/*.svg`-Datei übernehmen
  (inkl. `viewBox="-0.75 -0.75 14 14"`, nicht auf `"0 0 14 14"` normalisieren).
  Bei Verdacht auf Abweichung lieber programmatisch diffen (Pfad-Strings
  extrahieren und vergleichen) statt die langen Koordinaten von Auge zu
  prüfen.

## Simulator-Verifikation (idb)

- `idb-companion` + `fb-idb` sind installiert, um den iOS Simulator selbst zu
  steuern (`idb screenshot`, `idb ui tap`, etc.).
- **Screenshots funktionieren zuverlässig.** Tap/Swipe-Events (`idb ui tap`)
  waren in dieser Sandbox-Umgebung zeitweise komplett wirkungslos (Companion
  meldet Erfolg, aber am Gerät passiert sichtbar nichts) — auch nach
  komplettem Simulator-Neustart. Vermutlich eine Einschränkung der
  Sandbox (kein echtes WindowServer-Touch-Routing), kein Berechtigungsfehler
  (TCC-Logs zeigten nichts Auffälliges). Falls Tap wieder nicht reagiert:
  nicht stundenlang debuggen, sondern kurz Bescheid geben und auf
  Bundle-Kompilierung + exakten Quellcode-Abgleich als Verifikation
  zurückfallen.
- Nach reinen JS-Änderungen reicht ein Bundle-Kompilierungs-Check statt
  eines Neustarts:
  `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false"`
  Fast Refresh übernimmt offene Modals/Screens meist automatisch.

## Arbeitsstil

- Keine Screenshots zur Selbstbestätigung machen, außer explizit gefordert.
- Vor größeren Menü-/Feature-Umbauten: bei Unklarheit über auszulassende
  Web-Funktionen (z. B. Bookmarklet, Embed) kurz nachfragen statt still
  wegzulassen oder unaufgefordert zu ergänzen.
