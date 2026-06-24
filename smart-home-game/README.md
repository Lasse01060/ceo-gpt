# 🏠 Smart Home — Sprich mit deinem Haus

Ein begehbares 3D-Smart-Home für deine **Physik-Präsentation**. Die Kamera fährt
wie in einem Tutorial von Raum zu Raum und zeigt dir, **was du sagen sollst**.
Sprich das Kommando — und das Haus reagiert: Lichter gehen an, Wände wechseln die
Farbe, das Induktionsfeld glüht, ein Roboter wäscht die Wäsche, die Heizung regelt
sich selbst. Zu jeder Station gibt es eine kurze **Physik-Erklärung**.

Läuft komplett im Browser. Keine App, keine Installation, kein App-Store.

---

## 📱 So bringst du es auf das iPad (mit Stimme)

Damit das **Mikrofon** funktioniert, muss die Seite über eine sichere Internet-Adresse
(`https://`) laufen. Das ist Pflicht von Apple — lokal geöffnete Dateien dürfen das Mikro nicht nutzen.
Zwei einfache Wege:

### Weg A — GitHub Pages (wenn dein Repo öffentlich oder du GitHub Pro hast)
1. Auf GitHub in dein Repo gehen → **Settings → Pages**.
2. Bei *Source* **„Deploy from a branch"** wählen.
3. Branch auswählen (der mit dem Spiel), Ordner **`/ (root)`**, **Save**.
4. 1–2 Minuten warten. Deine Adresse ist dann:
   **`https://lasse01060.github.io/ceo-gpt/smart-home-game/`**
5. Diese Adresse im **Safari auf dem iPad** öffnen, beim Mikro **„Erlauben"** tippen.

### Weg B — Netlify Drop (am einfachsten, ohne Konto)
1. Den Ordner `smart-home-game` auf deinen Computer laden.
2. **[app.netlify.com/drop](https://app.netlify.com/drop)** öffnen.
3. Den ganzen Ordner per Drag & Drop ins Fenster ziehen.
4. Du bekommst sofort eine `https://…netlify.app`-Adresse — die auf dem iPad öffnen.

> **Wichtig:** Das Mikro funktioniert **nicht** über `file://` (Datei direkt geöffnet)
> und auch **nicht** über eine normale `http://`-LAN-Adresse. Nur über `https://`.

---

## 💻 Schnell am Computer testen

Im Ordner `smart-home-game` ein kleines Server-Fenster starten:

```bash
python3 -m http.server 8765
```

Dann im Browser **`http://localhost:8765`** öffnen. Am Computer geht über `localhost`
auch das Mikro. (Direkt-Doppelklick auf `index.html` funktioniert wegen Browser-Schutz
**nicht** zuverlässig — bitte den Server nutzen.)

---

## 🗣️ Die Sprachbefehle

| Station | Sag laut … | Was passiert |
|---|---|---|
| 1 · Licht | **„Licht an"** | Alle Lampen gehen an |
| 2 · Wände | **„Wand blau"** (oder rot, grün, gelb, lila, türkis, pink …) | Die Wand wechselt die Farbe |
| 3 · Küche | **„Herd an"** | Induktionsfeld glüht, Topf dampft |
| 4 · Wäsche | **„Wäsche waschen"** | Der Roboter fährt los, die Trommel dreht |
| 5 · Heizung | **„Wärmer"** | Heizkörper glüht, Temperatur steigt |
| 6 · Finale | — | Frei umsehen (Wischen / zwei Finger zum Zoomen) |

Es zählt das **Stichwort** — du musst nicht exakt sprechen. „Mach das Licht an" reicht auch.

---

## 🎤 Wenn das Mikro mal nicht will (Sicherheitsnetz)

Kein Stress — **jede Station hat einen Knopf „Per Tipp auslösen"**. Damit läuft die
ganze Präsentation auch komplett ohne Stimme. Deine Präsentation fällt nie aus.

Falls die Stimme nicht reagiert:
- Läuft die Seite über `https://`? (siehe oben) — sonst ist das Mikro gesperrt.
- Beim ersten Start auf **„Erlauben"** getippt?
- Auf dem iPad: **Einstellungen → Safari → Mikrofon → Erlauben**, und
  **Einstellungen → Allgemein → Tastatur → Diktierfunktion** aktiviert.
- Oben rechts auf das **Mikro-Symbol** tippen schaltet das Zuhören an/aus.

---

## 🔬 Physik-Spickzettel (deine Redepunkte)

Auf den Knopf **„🔬 Physik dahinter"** tippen, dann erscheint die Erklärung im Spiel.
Hier zum Vorbereiten:

- **Licht (LED):** Strom → Elektronen fallen auf ein tieferes Energieniveau → geben ein
  Lichtteilchen (Photon) ab. *E = h · f*. Kaum Wärmeverlust → sehr effizient.
- **Farbe (Wände):** Licht ist eine elektromagnetische Welle. Farbe = Wellenlänge
  (rot ≈ 700 nm, blau ≈ 450 nm). RGB-LEDs mischen additiv jede Farbe. *c = λ · f*.
- **Induktionsfeld:** Wechselndes Magnetfeld → Wirbelströme im Topfboden → Widerstand
  erzeugt Wärme. Der Topf heizt sich selbst. *U = −N · dΦ/dt* (Faraday).
- **Roboter & Motor:** Elektromotor — stromdurchflossener Leiter im Magnetfeld erfährt
  eine Kraft. Strom → Bewegung. *F = B · I · L* (Lorentzkraft).
- **Heizung:** Wärmeübertragung per Leitung, Konvektion (warme Luft steigt) und
  Strahlung (Infrarot). *Q = m · c · ΔT*.
- **Die Stimme selbst:** Schallwelle (Luftdruck) → Mikrofon macht daraus Spannung →
  Digitalisierung → Software erkennt das Muster → Befehl.

---

## 🛠️ Technisches (für Neugierige)

- **3D-Engine:** [Three.js](https://threejs.org) r160 — liegt fertig in `vendor/` im
  Projekt, lädt also **ohne Internet-Server von außen** (gut, falls das Schul-WLAN CDNs blockt).
- **Stimme:** Web Speech API (`SpeechRecognition`, Sprache `de-DE`), läuft in Safari/Chrome.
- **Dateien:** `index.html` (Aufbau), `style.css` (Aussehen), `main.js` (3D-Welt + Tour +
  Sprache), `vendor/three.module.js` (3D-Engine).
- Alles ist mit einfachen Formen gebaut (keine schweren 3D-Dateien) → läuft flüssig auf dem iPad.

Viel Erfolg bei der Präsentation! 🎉
