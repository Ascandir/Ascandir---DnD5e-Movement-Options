/**
 * Ascandir - DnD5e Movement Options
 *
 * Lässt den Spielleiter festlegen, ob das Bewegen durch Felder befreundeter Token
 * als schwieriges Gelände zählt und bei welchen Größen feindliche Token
 * schwieriges Gelände sind. Greift direkt in die Bewegungskosten-Berechnung
 * des dnd5e-Systems ein (Token-Ruler, Wegpunkte, Bewegungsanzeige).
 *
 * Technik: dnd5e ruft beim Prüfen jedes Feldes den Hook
 * "dnd5e.determineOccupiedGridSpaceDifficult" auf und übergibt die Menge der
 * Token, die das Feld zu schwierigem Gelände machen. Diese Menge passen wir an.
 */

const MODULE_ID = "ascandir-dnd5e-movement-options";
const SETTING_FRIENDLY = "friendlyTokensDifficult";

const MODES = {
  SYSTEM: "system",       // Verhalten von dnd5e (2014: schwierig, 2024: nicht schwierig)
  DIFFICULT: "difficult", // Befreundete Token sind immer schwieriges Gelände
  NORMAL: "normal"        // Befreundete Token sind nie schwieriges Gelände
};

/**
 * Kreaturengrößen von dnd5e (Schlüssel aus CONFIG.DND5E.actorSizes) mit Sprach-Schlüssel.
 * Für jede Größe gibt es ein Häkchen, ob feindliche Token dieser Größe schwieriges Gelände sind.
 */
const HOSTILE_SIZES = {
  tiny: "Tiny",
  sm: "Small",
  med: "Medium",
  lg: "Large",
  huge: "Huge",
  grg: "Gargantuan"
};
const hostileSettingKey = size => `hostileDifficult.${size}`;

/* -------------------------------------------- */
/*  Einstellungen                               */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_FRIENDLY, {
    name: "AMO.Settings.FriendlyDifficult.Name",
    hint: "AMO.Settings.FriendlyDifficult.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: MODES.DIFFICULT,
    choices: {
      [MODES.DIFFICULT]: "AMO.Settings.FriendlyDifficult.Difficult",
      [MODES.NORMAL]: "AMO.Settings.FriendlyDifficult.Normal",
      [MODES.SYSTEM]: "AMO.Settings.FriendlyDifficult.System"
    }
  });

  // Ein Häkchen pro Größe für feindliche Token.
  for ( const [size, label] of Object.entries(HOSTILE_SIZES) ) {
    game.settings.register(MODULE_ID, hostileSettingKey(size), {
      name: `AMO.Settings.HostileDifficult.${label}`,
      hint: "AMO.Settings.HostileDifficult.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: Boolean,
      default: true
    });
  }
});

Hooks.once("ready", () => {
  if ( game.system.id !== "dnd5e" ) {
    if ( game.user.isGM ) ui.notifications.warn(game.i18n.localize("AMO.Warnings.WrongSystem"));
    return;
  }
  Hooks.on("dnd5e.determineOccupiedGridSpaceDifficult", onDetermineDifficult);
});

/* -------------------------------------------- */
/*  Kernlogik                                   */
/* -------------------------------------------- */

/**
 * Passt die Menge der Token an, die ein Feld für den bewegten Token zu schwierigem Gelände machen.
 * @param {GridOffset3D} gridSpace  Das geprüfte Feld.
 * @param {Token} token             Der bewegte Token.
 * @param {object} options
 * @param {boolean} options.preview Ob es sich um eine Vorschau (Ziehen) handelt.
 * @param {Set<Token>} found        Token, die das Feld schwierig machen. Wird verändert.
 */
function onDetermineDifficult(gridSpace, token, { preview=false }={}, found) {
  const friendlyMode = game.settings.get(MODULE_ID, SETTING_FRIENDLY);
  const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";

  // Alle Token auf dem Feld prüfen – auch die, die das System bereits herausgefiltert hat.
  const candidates = new Set([...getOccupyingTokens(gridSpace, token, { preview }), ...found]);
  for ( const t of candidates ) {
    if ( !t.actor?.system?.isCreature ) continue; // Nur Kreaturen sind schwieriges Gelände.

    let difficult;
    if ( isFriendly(token, t) ) {
      if ( friendlyMode === MODES.SYSTEM ) continue; // dnd5e entscheidet selbst.
      if ( friendlyMode === MODES.NORMAL ) difficult = false;
      // Nach den 2024-Regeln zählen winzige Kreaturen nie als schwieriges Gelände.
      else difficult = !(modernRules && (getSizeValue(t) === 0));
    }
    else difficult = isHostileSizeDifficult(t);

    if ( difficult ) found.add(t);
    else found.delete(t);
  }
}

/**
 * Hat der SL für die Größe dieses (feindlichen) Tokens ein Häkchen gesetzt?
 * Unbekannte Größen (z. B. aus anderen Modulen) zählen als schwierig.
 * @param {Token} t
 * @returns {boolean}
 */
function isHostileSizeDifficult(t) {
  const size = t.actor?.system?.traits?.size;
  if ( !(size in HOSTILE_SIZES) ) return true;
  return game.settings.get(MODULE_ID, hostileSettingKey(size));
}

/**
 * Zahlenwert der Größe (0 = winzig, 2 = mittelgroß, …).
 * @param {Token} t
 * @returns {number}
 */
function getSizeValue(t) {
  return CONFIG.DND5E.actorSizes[t.actor?.system?.traits?.size]?.numerical ?? 2;
}

/**
 * Gilt der andere Token als befreundet? (gleiche Gesinnung/Disposition wie bei dnd5e)
 * @param {Token} mover
 * @param {Token} other
 * @returns {boolean}
 */
function isFriendly(mover, other) {
  return mover.document.disposition === other.document.disposition;
}

/**
 * Alle Token, die ein Feld belegen und für Bewegung relevant sind.
 * Entspricht der (privaten) Auswahl, die dnd5e selbst verwendet.
 * @param {GridOffset3D} gridSpace
 * @param {Token} token
 * @param {object} options
 * @param {boolean} options.preview
 * @returns {Set<Token>}
 */
function getOccupyingTokens(gridSpace, token, { preview=false }={}) {
  const grid = canvas.grid;
  if ( !grid || grid.isGridless ) return new Set();
  const topLeft = grid.getTopLeftPoint(gridSpace);
  const rect = new PIXI.Rectangle(topLeft.x, topLeft.y, grid.sizeX, grid.sizeY);
  const k = gridSpace.k ?? 0;
  const lowerElevation = k * grid.distance;
  const upperElevation = (k + 1) * grid.distance;

  return canvas.tokens.quadtree.getObjects(rect, {
    collisionTest: ({ t }) => {
      if ( t === token ) return false;                                   // sich selbst ignorieren
      if ( canvas.tokens.controlled.includes(t) ) return false;          // gemeinsam bewegte Token
      if ( t.document.hidden ) return false;                             // versteckte Token
      if ( preview && !t.visible ) return false;                         // nichts Unsichtbares verraten
      if ( t.document.disposition === CONST.TOKEN_DISPOSITIONS.SECRET ) return false;
      const elevation = t.document._source.elevation;
      if ( (elevation < lowerElevation) || (elevation >= upperElevation) ) return false;
      const spaces = t.document.getOccupiedGridSpaceOffsets(t.document._source);
      return spaces.some(c => (c.i === gridSpace.i) && (c.j === gridSpace.j));
    }
  });
}
