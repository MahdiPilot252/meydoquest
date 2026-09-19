type Eintrag = {
  versuche: number;
  resetUm: number;
};

const globalMitSpeicher = globalThis as typeof globalThis & {
  __meydoRateLimitSpeicher?: Map<string, Eintrag>;
};

const speicher = globalMitSpeicher.__meydoRateLimitSpeicher ?? new Map<string, Eintrag>();

if (!globalMitSpeicher.__meydoRateLimitSpeicher) {
  globalMitSpeicher.__meydoRateLimitSpeicher = speicher;
}

export function pruefeRateLimit(schluessel: string, maximum: number, fensterMs: number) {
  const jetzt = Date.now();
  const gefunden = speicher.get(schluessel);

  if (!gefunden || gefunden.resetUm <= jetzt) {
    speicher.set(schluessel, { versuche: 1, resetUm: jetzt + fensterMs });
    return { erlaubt: true, uebrig: maximum - 1, resetUm: jetzt + fensterMs };
  }

  if (gefunden.versuche >= maximum) {
    return { erlaubt: false, uebrig: 0, resetUm: gefunden.resetUm };
  }

  gefunden.versuche += 1;
  speicher.set(schluessel, gefunden);

  return { erlaubt: true, uebrig: maximum - gefunden.versuche, resetUm: gefunden.resetUm };
}
