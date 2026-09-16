/**
 * Helper to compact and format product sizes into a clean, compact badge string.
 * Examples:
 * - ['EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'] -> "39–44" or "EU 39–44"
 * - ['Size 28', 'Size 29', 'Size 30', 'Size 32'] -> "28–32"
 * - ['S', 'M', 'L', 'XL'] -> "S–XL" or "S, M, L, XL" (if small)
 * - ['38', '39', '40', '41', '42'] -> "38–42"
 */
export function formatSizesDisplay(sizes?: string[]): string | null {
  if (!sizes || sizes.length === 0) return null;

  // Filter out any empty strings
  const cleanSizes = sizes.map((s) => s.trim()).filter(Boolean);
  if (cleanSizes.length === 0) return null;

  // If only 1 or 2 sizes, just join them
  if (cleanSizes.length <= 2) {
    return cleanSizes.join(', ');
  }

  // Check if all are pure numbers or EU numbers (e.g. "EU 40", "40", "Size 32")
  const numericItems: { prefix: string; num: number; original: string }[] = [];
  let allNumeric = true;

  for (const s of cleanSizes) {
    const match = s.match(/^(?:(EU|Size|W|US|UK)\s*)?([0-9]{1,3})$/i);
    if (match && match[2]) {
      numericItems.push({
        prefix: match[1] ? match[1].toUpperCase() : '',
        num: parseInt(match[2], 10),
        original: s,
      });
    } else {
      allNumeric = false;
      break;
    }
  }

  if (allNumeric && numericItems.length > 2) {
    // Sort numerically
    numericItems.sort((a, b) => a.num - b.num);
    const min = numericItems[0];
    const max = numericItems[numericItems.length - 1];

    if (min.prefix && min.prefix === max.prefix) {
      return `${min.prefix} ${min.num}–${max.num}`;
    }
    return `${min.num}–${max.num}`;
  }

  // Standard clothing letter sizes order
  const letterOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];
  const upperSizes = cleanSizes.map((s) => s.toUpperCase());
  const allInLetterOrder = upperSizes.every((s) => letterOrder.includes(s));

  if (allInLetterOrder && cleanSizes.length > 2) {
    const sorted = [...upperSizes].sort((a, b) => letterOrder.indexOf(a) - letterOrder.indexOf(b));
    return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  }

  // If mixed / custom, show first few or range if short
  if (cleanSizes.length <= 3) {
    return cleanSizes.join(', ');
  }

  return `${cleanSizes[0]}–${cleanSizes[cleanSizes.length - 1]}`;
}
