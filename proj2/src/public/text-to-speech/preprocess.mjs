/* 
  TTS Preprocessing helper functions
*/
// Convert clock times into natural spoken English (e.g., "10:00 PM" -> "ten o'clock pm")
export function englishifyTimes(s) {
  let out = s;

  // "HH:MM AM/PM" (e.g., "10:00 PM", "3:05 a.m.")
  out = out.replace(/\b(\d{1,2}):([0-5]\d)\s*([AaPp])\.?\s*[Mm]\.?\b/g, (_, h, m, ap) => timeToWords(h, m, ap));

  // "HH AM/PM" (e.g., "7 PM", "11 a.m.")
  out = out.replace(/\b(\d{1,2})\s*([AaPp])\.?\s*[Mm]\.?\b/g, (_, h, ap) => timeToWords(h, null, ap));

  return out;
}

// Build the spoken string for a parsed time (handles “o'clock” and “oh five”)
function timeToWords(hStr, mStr, apLetter) {
  let h = Number(hStr);
  let m = mStr == null ? null : Number(mStr);
  const ap = String(apLetter).toLowerCase() === "p" ? "pm" : "am";

  // Normalize to 12-hour clock for speech
  h = h % 12 || 12;

  const hourWords = numberToWordsUnderBillion(h);
  if (m == null) return `${hourWords} ${ap}`; // "7 PM"
  if (m === 0) return `${hourWords} o'clock ${ap}`; // "10:00 PM"
  if (m < 10) return `${hourWords} oh ${numberToWordsUnderBillion(m)} ${ap}`; // "3:05 am"
  return `${hourWords} ${numberToWordsUnderBillion(m)} ${ap}`; // "12:30 pm"
}

// Expand numbers/currency/percentages so TTS pronounces them naturally in English
export function englishifyNumbers(s) {
  let out = s;

  // 1) Dollar amounts (preserve leading whitespace via capture group 1)
  //    Handles "-$123.45", "$-123.45", "$1,234", "$19.99"
  out = out.replace(/(\s*)(?:-\s*)?\$\s*(?:-\s*)?(\d[\d,]*(?:\.\d+)?)/g, (m, lead, num) => {
    const negative = /-/.test(m);
    const numeric = String(num).replace(/,/g, "");
    const words = dollarsToWords(numeric);
    return lead + (negative ? "minus " : "") + words;
  });

  // 2) Percentages (preserve leading whitespace via capture group 1)
  //    Handles "-12.5%", "7%", "1,200%"
  out = out.replace(/(\s*)(?:-\s*)?(\d[\d,]*(?:\.\d+)?)\s*%/g, (m, lead, num) => {
    const negative = /-/.test(m);
    const numeric = String(num).replace(/,/g, "");
    let words;
    if (numeric.includes(".")) {
      const [i, f] = numeric.split(".");
      const intWords = intToWordsSafe(i);
      const fracWords = f
        .split("")
        .map((d) => digitWord(d))
        .join(" ");
      words = `${intWords} point ${fracWords} percent`;
    } else {
      words = `${intToWordsSafe(numeric)} percent`;
    }
    return lead + (negative ? "minus " : "") + words;
  });

  // 3) Remaining numbers (integers/decimals) – this one never swallows preceding spaces
  out = out.replace(/(?<![A-Za-z])\d[\d,\.]*\d|\b\d\b/g, (numStr) => {
    const hasDot = numStr.includes(".");
    const hasComma = numStr.includes(",");
    let cleaned = numStr;
    if (hasComma && (!hasDot || /\d,\d{3}(\D|$)/.test(numStr))) {
      cleaned = cleaned.replace(/,/g, "");
    }
    if (cleaned.includes(".")) {
      const [intPart, fracPart] = cleaned.split(".");
      const intWords = intToWordsSafe(intPart);
      const fracWords = (fracPart || "")
        .split("")
        .map((d) => digitWord(d))
        .join(" ");
      return fracPart ? `${intWords} point ${fracWords}` : intWords;
    } else {
      return intToWordsSafe(cleaned);
    }
  });

  return out;
}

// "$123.45" -> "one hundred twenty-three dollars and forty five cents"
export function dollarsToWords(numeric) {
  const [intPartRaw, fracRaw] = numeric.split(".");
  const intPart = (intPartRaw || "0").replace(/^0+(?!$)/, "");
  let cents = Math.round(Number("0." + (fracRaw || "0")) * 100);
  let dollars = Number(intPart || "0");
  if (cents === 100) {
    dollars += 1;
    cents = 0;
  }

  const dWords = numberToWordsUnderBillion(dollars);
  const dUnit = dollars === 1 ? "dollar" : "dollars";

  if (cents > 0) {
    const cWords = numberToWordsUnderBillion(cents);
    const cUnit = cents === 1 ? "cent" : "cents";
    if (dollars > 0) return `${dWords} ${dUnit} and ${cWords} ${cUnit}`;
    return `${cWords} ${cUnit}`;
  }
  return `${dWords} ${dUnit}`;
}

// Integer to words; fall back to digit-by-digit for very large inputs
export function intToWordsSafe(intStr) {
  intStr = String(intStr).replace(/^0+(?!$)/, "");
  if (intStr.length > 9) return intStr.split("").map(digitWord).join(" ");
  const n = Number(intStr);
  if (!Number.isFinite(n)) return intStr.split("").map(digitWord).join(" ");
  return numberToWordsUnderBillion(n);
}

// 0–9 -> word
function digitWord(d) {
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][Number(d)] || d;
}

// 1..999,999,999 -> words (English)
function numberToWordsUnderBillion(n) {
  if (n === 0) return "zero";
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = [
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function underThousand(x) {
    let out = "";
    const h = Math.floor(x / 100);
    const r = x % 100;
    if (h) out += ones[h] + " hundred";
    if (h && r) out += " ";
    if (r >= 20) {
      out += tens[Math.floor(r / 10)];
      if (r % 10) out += "-" + ones[r % 10];
    } else if (r >= 10) {
      out += teens[r - 10];
    } else if (r > 0) {
      out += ones[r];
    }
    return out;
  }

  const parts = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;
  if (millions) parts.push(underThousand(millions) + " million");
  if (thousands) parts.push(underThousand(thousands) + " thousand");
  if (rest) parts.push(underThousand(rest));
  return parts.join(" ");
}

// Split text into paragraphs at blank lines; only split within a paragraph if absolutely necessary
export function chunkText(text, maxLen) {
  const paras = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const out = [];
  for (const p of paras) {
    if (p.length <= maxLen) out.push(p);
    else out.push(...splitByLen(p, maxLen)); // fallback for very long paragraphs
  }
  return out;
}

// Break a long paragraph into chunks below maxLen, preferring whitespace/punctuation boundaries
function splitByLen(s, maxLen) {
  const parts = [];
  let cur = "";
  const tokens = s.split(/(\s+|,|;|:)/);
  for (const t of tokens) {
    if ((cur + t).length > maxLen) {
      if (cur.trim()) parts.push(cur.trim());
      cur = t.trimStart();
      while (cur.length > maxLen) {
        parts.push(cur.slice(0, maxLen));
        cur = cur.slice(maxLen);
      }
    } else {
      cur += t;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}
