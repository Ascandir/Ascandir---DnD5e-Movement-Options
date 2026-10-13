/**
 * Ascandir - DnD5e Movement Options
 *
 * Lässt den Spielleiter festlegen, ob das Bewegen durch Felder befreundeter Token
 * als schwieriges Gelände zählt. Greift direkt in die Bewegungskosten-Berechnung
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
  const mode = game.settings.get(MODULE_ID, SETTING_FRIENDLY);
  if ( mode === MODES.SYSTEM ) return;

  // Nie schwierig: alle befreundeten Token entfernen.
  if ( mode === MODES.NORMAL ) {
    for ( const t of [...found] ) {
      if ( isFriendly(token, t) ) found.delete(t);
    }
    return;
  }

  // Immer schwierig: befreundete Token ergänzen, die das System (2024-Regeln) herausgefiltert hat.
  if ( mode === MODES.DIFFICULT ) {
    const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";
    for ( const t of getOccupyingTokens(gridSpace, token, { preview }) ) {
      if ( found.has(t) ) continue;
      if ( !isFriendly(token, t) ) continue;
      if ( !t.actor?.system?.isCreature ) continue;
      // Nach den 2024-Regeln zählen winzige Kreaturen nie als schwieriges Gelände.
      const size = CONFIG.DND5E.actorSizes[t.actor.system.traits?.size]?.numerical ?? 2;
      if ( modernRules && (size === 0) ) continue;
      found.add(t);
    }
  }
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
