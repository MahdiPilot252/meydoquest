type ValidatorType =
  | "exact"
  | "normalized_text"
  | "multiple_valid_answers"
  | "single_choice"
  | "multiple_select"
  | "true_false"
  | "numeric";

export type ValidatorConfig = {
  expected?: string;
  acceptedAnswers?: string[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correct?: boolean;
  numericAnswer?: number;
  tolerance?: number;
};

export type LearnerResponse = {
  text?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  booleanValue?: boolean;
  numericValue?: number;
};

export type ValidationResult = {
  isCorrect: boolean;
  score: number;
  feedback: string;
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }

  const aSorted = [...a].sort();
  const bSorted = [...b].sort();

  return aSorted.every((value, index) => value === bSorted[index]);
}

export function validateExerciseAnswer(
  validatorType: ValidatorType,
  validatorConfig: ValidatorConfig,
  response: LearnerResponse,
): ValidationResult {
  switch (validatorType) {
    case "exact": {
      const isCorrect = (response.text ?? "") === (validatorConfig.expected ?? "");
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? "Exakt richtig." : "Die exakte Zielantwort wurde nicht getroffen.",
      };
    }
    case "normalized_text": {
      const expected = normalizeText(validatorConfig.expected ?? "");
      const actual = normalizeText(response.text ?? "");
      const isCorrect = actual.length > 0 && actual === expected;
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? "Richtig erkannt." : "Die normalisierte Antwort passt noch nicht.",
      };
    }
    case "multiple_valid_answers": {
      const validAnswers = (validatorConfig.acceptedAnswers ?? []).map(normalizeText);
      const actual = normalizeText(response.text ?? "");
      const isCorrect = actual.length > 0 && validAnswers.includes(actual);
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? "Eine gültige Antwort erkannt." : "Die Antwort gehört nicht zu den gültigen Lösungen.",
      };
    }
    case "single_choice": {
      const isCorrect = (response.selectedOptionId ?? "") === (validatorConfig.correctOptionId ?? "");
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? "Option korrekt gewählt." : "Die gewählte Option ist nicht korrekt.",
      };
    }
    case "multiple_select": {
      const actual = response.selectedOptionIds ?? [];
      const expected = validatorConfig.correctOptionIds ?? [];
      const isCorrect = arraysEqual(actual, expected);
      const partialScore = expected.length > 0 ? actual.filter((value) => expected.includes(value)).length / expected.length : 0;
      return {
        isCorrect,
        score: isCorrect ? 1 : Number(partialScore.toFixed(2)),
        feedback: isCorrect ? "Alle richtigen Optionen gewählt." : "Teilweise korrekt – prüfe die markierten Optionen erneut.",
      };
    }
    case "true_false": {
      const isCorrect = response.booleanValue === validatorConfig.correct;
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? "Aussage korrekt bewertet." : "Die Wahr/Falsch-Antwort ist nicht korrekt.",
      };
    }
    case "numeric": {
      const tolerance = validatorConfig.tolerance ?? 0;
      const expected = validatorConfig.numericAnswer ?? 0;
      const actual = response.numericValue;
      const isCorrect = typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? "Numerische Antwort innerhalb der Toleranz." : "Die Zahl liegt außerhalb der akzeptierten Toleranz.",
      };
    }
    default:
      return {
        isCorrect: false,
        score: 0,
        feedback: "Unbekannter Validator.",
      };
  }
}
