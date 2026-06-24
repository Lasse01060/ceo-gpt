# CEO-GPT Historie

> Zeitliches Logbuch aller Arbeiten in diesem CEO-GPT. Wird jede Session aktualisiert.
> Neueste Einträge oben. Jeder Eintrag hat Datum, Titel und Bullet Points.
>
> **So läuft's:** Wenn du `/commit` nach einer sinnvollen Arbeit ausführst, trägt dein
> Mitarbeiter hier automatisch ein. Du musst diese Datei nicht selbst schreiben.

---

## 2026-06-24

### Smart-Home-Spiel für Physik-Präsentation

- Begehbares 3D-Smart-Home als Web-Spiel gebaut (`smart-home-game/`), läuft im Browser auf dem iPad
- Geführte Kamera-Tour im Tutorial-Stil: Kamera fährt von Raum zu Raum und zeigt das Sprach-Kommando an
- Sprachsteuerung über die Web Speech API (Deutsch), mit Tipp-Knopf als Sicherheitsnetz
- Smart-Home-Effekte: Licht an, Wände wechseln die Farbe, Induktionsküche, Wäsche-Roboter, selbstregelnde Heizung
- Zu jeder Station eine kurze Physik-Erklärung (LED/Photon, Wellenlänge/Farbe, Induktion, Lorentzkraft, Thermodynamik)
- Three.js r160 lokal ins Projekt gelegt (`vendor/`), damit es auch ohne externes CDN läuft (Schul-WLAN)

## 2026-05-19

### Erstes Setup: Absicherung installiert

- CEO-GPT mit der Absicherung initialisiert
- Git aufgesetzt, erster Schnappschuss gemacht, Identität konfiguriert (Lasse01060)
- GitHub-CLI per winget installiert, Konto verbunden
- Privates Repo `Lasse01060/ceo-gpt` angelegt, lokaler Stand hochgeladen
- `.gitignore` schützt `.env`, `outputs/`, `shares/`, `context/import/`, `data/*.db*`
- `.env.example` als Vorlage angelegt
- Doku-System angelegt (`docs/` Ordner mit Routing-Index und Vorlagen)
- `/commit` Befehl installiert für strukturierte Commits mit automatischer Doku
- `/prime` erweitert: liest jetzt HISTORY.md und docs/_index.md mit
- `/implement` erweitert: Doku-Bewusstsein eingebaut
