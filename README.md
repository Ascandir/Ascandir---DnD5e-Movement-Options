# Ascandir - DnD5e Movement Options

Bewegungsoptionen für Foundry VTT (v14) mit dem Spielsystem D&D 5e (6.x).

## Funktionen

### Befreundete Token als schwieriges Gelände

Der Spielleiter legt in den Moduleinstellungen fest, ob das Bewegen durch ein Feld, auf dem ein
befreundeter Token steht, als **schwieriges Gelände** zählt:

| Einstellung | Wirkung |
|---|---|
| **Ja** (Standard) | Felder mit befreundeten Token kosten doppelte Bewegung. |
| **Nein** | Befreundete Token kosten keine zusätzliche Bewegung. |
| **Wie im System** | Verhalten von dnd5e: Regeln 2014 → schwierig, Regeln 2024 → nicht schwierig. |

Foundry berechnet die Bewegung dann direkt so – im Bewegungs-Lineal beim Ziehen, bei Wegpunkten
und in der Anzeige der verbrauchten Bewegung.

### Feindliche Token als schwieriges Gelände – je nach Größe

Für jede Kreaturengröße gibt es in den Moduleinstellungen ein eigenes Häkchen:
Winzig, Klein, Mittelgroß, Groß, Riesig, Gigantisch.

- **Häkchen gesetzt**: Feindliche Token dieser Größe sind schwieriges Gelände (doppelte Bewegung).
- **Kein Häkchen**: Felder mit feindlichen Token dieser Größe kosten normal.

Standardmäßig sind alle Häkchen gesetzt. „Feindlich“ heißt hier: andere Gesinnung als der bewegte
Token (also auch neutrale Token). Token, die den Weg nach den dnd5e-Regeln blockieren, blockieren
weiterhin – die Häkchen gelten für die Felder, durch die man hindurch darf.

**Hinweise**

- „Befreundet“ heißt wie bei dnd5e: gleiche Gesinnung (Disposition) des Tokens.
- Nach den Regeln 2024 zählen winzige (Tiny) befreundete Kreaturen nie als schwieriges Gelände.
  Bei feindlichen Token entscheidet das Häkchen „Winzig“.
- Steht ein Feld bereits in einer Region mit schwierigem Gelände, wird nicht doppelt gerechnet.
- Funktioniert nur auf Szenen mit Raster und wenn in den dnd5e-Einstellungen die
  Bewegungsautomatisierung nicht auf „Keine“ steht.

## Installation

In Foundry unter **Module installieren** diese Manifest-URL eintragen:

```
https://github.com/Ascandir/Ascandir---DnD5e-Movement-Options/releases/latest/download/module.json
```
