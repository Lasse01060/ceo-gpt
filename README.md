# 🏠 Smart Home — Sprich mit deinem Haus

Ein begehbares 3D-Smart-Home für deine **Physik-Präsentation**. Die Kamera fährt
wie in einem Tutorial von Raum zu Raum und zeigt dir, **was du sagen sollst**.
Sprich das Kommando — und das Haus reagiert: Lichter gehen an, Wände wechseln die
Farbe, das Induktionsfeld glüht, ein Roboter wäscht die Wäsche, die Heizung regelt
sich selbst. Zu jeder Station gibt es eine kurze **Physik-Erklärung**.

Läuft komplett im Browser (Safari auf dem iPad). Keine App, keine Installation.

> Dieses Repo enthält **nur das Spiel** — die Dateien liegen direkt in der Wurzel
> (`index.html`, `style.css`, `main.js`, `vendor/`).

---

## 📱 So bringst du es auf das iPad (mit Stimme)

Damit das **Mikrofon** funktioniert, muss die Seite über eine sichere Internet-Adresse
(`https://`) laufen — eine Datei direkt zu öffnen reicht nicht (Apple-Regel).

### Weg A — Netlify (Repo bleibt privat) · alles vom iPad aus
1. In **Safari** dein GitHub-Repo öffnen, oben auf den **Branch** `claude/kind-bardeen-in67p5` wechseln.
2. Grüner **„Code"**-Knopf → **„Download ZIP"** (ggf. vorher „aA → Desktop-Website anfordern").
3. **Dateien-App** → die `.zip` antippen, sie entpackt sich zu einem Ordner (darin liegt `index.html` ganz oben).
4. **[app.netlify.com/drop](https://app.netlify.com/drop)** öffnen und den **entpackten Ordner** ins Feld ziehen
   (am iPad per Split View: Safari + Dateien nebeneinander).
5. Du bekommst eine `https://…netlify.app`-Adresse → auf dem iPad öffnen, beim Mikro **„Erlauben"** tippen.

### Weg B — GitHub Pages (schnellster Link, Repo muss öffentlich sein)
1. Auf GitHub: **Settings → Pages**.
2. *Source* = **„Deploy from a branch"**, Branch `claude/kind-bardeen-in67p5`, Ordner **`/ (root)`**, **Save**.
3. Nach 1–2 Minuten: **`https://lasse01060.github.io/ceo-gpt/`** im Safari öffnen.

> Hinweis zu Weg B: Bei einem **kostenlosen** GitHub-Konto muss das Repo dafür **öffentlich** sein.
> Diese Version enthält nur das Spiel, aber deine früheren Notizen sind in der
> Versionsgeschichte / im `main`-Branch noch vorhanden. Wenn dir volle Privatsphäre
> wichtig ist, nimm **Weg A** — oder sag Bescheid, dann räume ich auch die Historie auf.

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
ganze Präsentation auch komplett ohne Stimme. Sie fällt nie aus.

Falls die Stimme nicht reagiert:
- Läuft die Seite über `https://`? (siehe oben) — sonst ist das Mikro gesperrt.
- Beim ersten Start auf **„Erlauben"** getippt?
- iPad: **Einstellungen → Safari → Mikrofon → Erlauben**, und
  **Einstellungen → Allgemein → Tastatur → Diktierfunktion** aktiviert.
- Oben rechts auf das **Mikro-Symbol** tippen schaltet das Zuhören an/aus.

---

## 🔬 Physik-Spickzettel (deine Redepunkte)

Im Spiel auf **„🔬 Physik dahinter"** tippen — hier zum Vorbereiten:

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

- **3D-Engine:** [Three.js](https://threejs.org) r160 — liegt fertig in `vendor/`, lädt also
  **ohne externen Server** (gut, falls das Schul-WLAN CDNs blockt).
- **Stimme:** Web Speech API (`SpeechRecognition`, Sprache `de-DE`), läuft in Safari/Chrome.
- **Dateien:** `index.html` (Aufbau), `style.css` (Aussehen), `main.js` (3D-Welt + Tour +
  Sprache), `vendor/three.module.js` (3D-Engine).
- Alles aus einfachen Formen gebaut (keine schweren 3D-Dateien) → läuft flüssig auf dem iPad.

Viel Erfolg bei der Präsentation! 🎉
