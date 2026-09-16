export interface ParsedTelegramItem {
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  sizes: string[];
  colors: string[];
  colorHex: Record<string, string>;
  category: 'Clothes' | 'Shoes';
  description: string;
  shortDescription: string;
  tags: string[];
  stock: number;
  isFeatured: boolean;
  isNew: boolean;
}

export function parseTelegramPostText(text: string, channelName: string): ParsedTelegramItem {
  const clean = text.trim();
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Extract Price (e.g. "Price: 1,799 ETB", "1,799birr", "3,500 ETB", "Price 1,799", "ዋጋ: 1,799", "1799 ETB", "1.799")
  let price = 2500;
  const priceRegexes = [
    /(?:price|ዋጋ|ዋጋው|ዋጋ:)\s*[:=-]?\s*([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{3,7})/i,
    /([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{3,7})\s*(?:etb|birr|ብር|k\b)/i,
    /(?:etb|birr|ብር)\s*([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{3,7})/i,
    /\b([1-9][0-9]{0,2}(?:[,\s.][0-9]{3})+|[1-9][0-9]{2,5})\s*k\b/i,
    /\b([1-9][0-9]{0,2}(?:,[0-9]{3})+)\b/,
    /\b([1-9][0-9]{2,5})\b/,
  ];

  for (const reg of priceRegexes) {
    const m = clean.match(reg);
    if (m && m[1]) {
      // Remove commas, periods (as thousands separators) or spaces in number string
      const normalizedStr = m[1].replace(/[,.\s]/g, '');
      const val = parseInt(normalizedStr, 10);
      if (val >= 100 && val <= 500000) {
        price = val;
        break;
      }
    }
  }

  // 2. Comprehensive Category Detection (Amharic + English)
  // Amharic Footwear keywords: ጫማ (chama), ጫማዎች (chamawoch), ስኒከር (sneaker), ቡትስ (boots), ኮንቨርስ (converse), ጆርዳን (jordan), ናይክ (nike), አዲዳስ (adidas), ሂልስ (heels), ሰንዳል (sandal), ሸበጥ (shebet), ፓንቶፍ (pantof), ስሊፐር (slipper), ሎፈር (loafer), ሞካሲን (moccasin), ክሮክስ (crocs)
  const amharicShoeRegex = /(?:ጫማ|ጫማዎች|ስኒከር|ቡትስ|ኮንቨርስ|ጆርዳን|ናይክ|አዲዳስ|ሂልስ|ሰንዳል|ሸበጥ|ፓንቶፍ|ስሊፐር|ሎፈር|ሞካሲን|ክሮክስ)/iu;
  
  // English Footwear keywords
  const englishShoeRegex = /\b(?:shoe|shoes|footwear|sneaker|sneakers|trainer|trainers|boot|boots|chelsea|loafer|loafers|heel|heels|pump|pumps|stiletto|slide|slides|sandal|sandals|slipper|slippers|flip\s*flop|clog|clogs|jordan|nike|yeezy|puma|adidas|crocs|timberland|converse|vans|derby|oxford|brogue|moccasin|air\s*force|dunk)\b/i;

  // Amharic Clothing keywords: ልብስ (libs), ልብሶች (libsoch), ሸሚዝ (shemiz), ቲሸርት (t-shirt), ቲ-ሸርት, ሹራብ (shurab), ጃኬት (jacket), ኮት (coat), ሱሪ (suri), ጂንስ (jeans), ቱታ (tuta), ቀሚስ (kemis), ቶፕ (top), ቁምጣ (qumta), ቬስት (vest), ካርዲጋን (cardigan), ሱፍ (suit), ጃምፕሱት (jumpsuit), ሌጊንግስ (leggings), ሁዲ (hoodie), ብሌዘር (blazer), ፖሎ (polo)
  const amharicClothingRegex = /(?:ልብስ|ልብሶች|ሸሚዝ|ቲሸርት|ቲ-ሸርት|ሹራብ|ጃኬት|ኮት|ሱሪ|ጂንስ|ቱታ|ቀሚስ|ቶፕ|ቁምጣ|ቬስት|ካርዲጋን|ሱፍ|ጃምፕሱት|ሌጊንግስ|ሁዲ|ብሌዘር|ፖሎ)/iu;

  // English Clothing keywords
  const englishClothingRegex = /\b(?:cloth|clothes|clothing|apparel|shirt|shirts|tee|tees|t-shirt|tshirt|polo|hoodie|hoodies|sweatshirt|sweater|knitwear|cardigan|jacket|jackets|coat|coats|windbreaker|puffer|bomber|blazer|suit|suits|vest|gilet|pant|pants|trouser|trousers|jean|jeans|denim|short|shorts|cargo|cargos|chino|chinos|sweatpants|jogger|joggers|tracksuit|trackpants|skirt|skirts|dress|dresses|top|tops|overcoat|kimono|legging|leggings)\b/i;

  // Check category indicators
  const hasShoeMatch = amharicShoeRegex.test(clean) || englishShoeRegex.test(clean);
  const hasClothMatch = amharicClothingRegex.test(clean) || englishClothingRegex.test(clean);

  // Check for typical shoe numerical size indicators (e.g. 39 to 45) vs clothing letter sizes (S, M, L, XL)
  const hasTypicalShoeSizes = /\b(?:39|40|41|42|43|44|45|46)\b/.test(clean) && !/\b(?:XS|S|M|L|XL|XXL|2XL|3XL)\b/i.test(clean);
  const hasTypicalClothSizes = /\b(?:XS|S|M|L|XL|XXL|2XL|3XL|4XL)\b/i.test(clean);

  let isShoe = false;
  if (hasShoeMatch && !hasClothMatch) {
    isShoe = true;
  } else if (!hasShoeMatch && hasClothMatch) {
    isShoe = false;
  } else if (hasShoeMatch && hasClothMatch) {
    // Both matched (e.g. "Nike shoes & hoodie"), disambiguate by title line or dominant size
    const firstLine = lines[0] || '';
    if (amharicShoeRegex.test(firstLine) || englishShoeRegex.test(firstLine)) {
      isShoe = true;
    } else if (hasTypicalShoeSizes) {
      isShoe = true;
    } else {
      isShoe = false;
    }
  } else {
    // Neither explicit keyword matched, determine by size pattern
    if (hasTypicalShoeSizes) {
      isShoe = true;
    } else {
      isShoe = false;
    }
  }

  const isJeansOrPants =
    /(?:ሱሪ|ጂንስ|ቁምጣ)/u.test(clean) ||
    /\b(?:jean|jeans|denim|pant|pants|trouser|trousers|short|shorts|cargo|cargos|chino|chinos)\b/i.test(clean);

  const category: 'Clothes' | 'Shoes' = isShoe ? 'Shoes' : 'Clothes';

  // 3. Extract Sizes
  // Handles:
  // - Apparel letter size ranges (e.g. M-3XL -> M, L, XL, 2XL, 3XL; S-XXL; XS-XL; ከ M - 3XL; ከ M እስከ 3XL)
  // - Apparel letter lists (e.g. M, L, XL, 2XL, 3XL or M/L/XL/2XL)
  // - Jeans waist sizes and ranges: 28-38, 28 to 36, 30, 32, 34, 36, W32/L34, 32x34
  // - Shoe sizes & ranges: 39-44, 38-45 (if footwear)
  const sizes: string[] = [];

  const APPAREL_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  const normalizeApparelSize = (s: string): string => {
    const u = s.toUpperCase().replace(/\s+/g, '');
    if (u === 'XXL' || u === '2X') return '2XL';
    if (u === 'XXXL' || u === '3X') return '3XL';
    if (u === 'XXXXL' || u === '4X') return '4XL';
    if (u === '5X') return '5XL';
    return u;
  };

  // A. Letter Size Range (e.g. M-3XL, M to 3XL, S-XXL, XS-XL, ከ M - 3XL, ከ S እስከ 3XL, Size: M - 3XL)
  const letterRangeRegex = /(?:size|sizes|መጠን|ሳይዝ)?\s*[:=-]?\s*(?:ከ\s*)?\b(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|4XL|XXXXL|5XL|2X|3X|4X|5X)\b\s*(?:-|–|—|to|\.\.|\/|እስከ)\s*(?:እስከ\s*)?\b(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|4XL|XXXXL|5XL|2X|3X|4X|5X)\b/i;
  const letterRangeMatch = clean.match(letterRangeRegex);

  if (letterRangeMatch && !isShoe) {
    const rawStart = letterRangeMatch[1];
    const rawEnd = letterRangeMatch[2];
    const startNorm = normalizeApparelSize(rawStart);
    const endNorm = normalizeApparelSize(rawEnd);

    const startIdx = APPAREL_SIZE_ORDER.indexOf(startNorm);
    const endIdx = APPAREL_SIZE_ORDER.indexOf(endNorm);

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      const expanded = APPAREL_SIZE_ORDER.slice(startIdx, endIdx + 1);
      expanded.forEach((sz) => {
        if (!sizes.includes(sz)) sizes.push(sz);
      });
    }
  }

  // B. Check for Jeans/Pants waist x length or waist notation: e.g. "W32 L34", "32x30", "32/34", "W30", "Size 32"
  const waistLengthMatch = clean.match(/\bW\s*([2-4][0-9])\s*(?:L\s*([2-4][0-9]))?\b/i) || clean.match(/\b([2-4][0-9])\s*[xX/]\s*([2-4][0-9])\b/);
  if (waistLengthMatch && isJeansOrPants) {
    const w = waistLengthMatch[1];
    const l = waistLengthMatch[2];
    const label = l ? `${w}x${l}` : `W${w}`;
    if (!sizes.includes(label)) sizes.push(label);
  }

  // C. Number ranges like "28-36", "30-38", "39-44", "ከ 39 እስከ 44"
  const rangeMatch = clean.match(/(?:size|መጠን|ሳይዝ|sizes|eu|waist|w)?\s*[:=-]?\s*(?:ከ\s*)?\b([2-4][0-9])\s*(?:-|–|—|to|\.\.|እስከ)\s*(?:እስከ\s*)?\b([2-4][0-9])\b/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (start >= 20 && end <= 50 && end >= start && end - start <= 16) {
      // Step by 1 (e.g. 39, 40, 41, 42, 43, 44 or 30, 31, 32, 33, 34, 35, 36)
      for (let s = start; s <= end; s++) {
        // For shoes prefix with 'EU', for clothes/jeans use standard numerical size (e.g. 'Size 32' or '32')
        const item = isShoe ? `EU ${s}` : isJeansOrPants ? `Size ${s}` : `${s}`;
        if (!sizes.includes(item)) sizes.push(item);
      }
    }
  }

  // D. Comma / space / slash separated numeric sizes: "Size: 28, 30, 32, 34, 36" or "39, 40, 41, 42"
  const separatedSizeMatch = clean.match(/(?:size|መጠን|ሳይዝ|sizes|eu|waist|w)\s*[:=-]?\s*([0-9\s,/\\-]+)/i);
  if (separatedSizeMatch && separatedSizeMatch[1]) {
    const numSizes = separatedSizeMatch[1].match(/\b([2-4][0-9])\b/g);
    if (numSizes && numSizes.length > 0) {
      numSizes.forEach((s) => {
        const item = isShoe ? `EU ${s}` : isJeansOrPants ? `Size ${s}` : `${s}`;
        if (!sizes.includes(item)) sizes.push(item);
      });
    }
  }

  // E. Discrete clothing letter sizes when no range was already captured
  if (sizes.length === 0 && !isShoe) {
    const clothingSizeMatch = clean.match(/\b(XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL)\b/gi);
    if (clothingSizeMatch && clothingSizeMatch.length > 0) {
      clothingSizeMatch.forEach((s) => {
        const norm = normalizeApparelSize(s);
        if (!sizes.includes(norm)) sizes.push(norm);
      });
    }
  }

  // E2. Discrete numeric sizes for shoes (36-47) or pants (28-44) without the word "size"
  if (sizes.length === 0) {
    if (isShoe) {
      const shoeSizeMatch = clean.match(/\b(3[6-9]|4[0-7])\b/g);
      if (shoeSizeMatch && shoeSizeMatch.length > 0) {
        shoeSizeMatch.forEach((s) => {
          const item = `EU ${s}`;
          if (!sizes.includes(item)) sizes.push(item);
        });
      }
    } else if (isJeansOrPants) {
      const pantsSizeMatch = clean.match(/\b(2[8-9]|3[0-9]|4[0-4])\b/g);
      if (pantsSizeMatch && pantsSizeMatch.length > 0) {
        pantsSizeMatch.forEach((s) => {
          const item = `Size ${s}`;
          if (!sizes.includes(item)) sizes.push(item);
        });
      }
    }
  }

  // F. Fallbacks if no size detected
  // Removed per user request: we do not add default sizes if none are found in the caption.

  // 4. Color Extraction (Excluded per user request - items imported without color specification)
  const colors: string[] = [];
  const colorHex: Record<string, string> = {};

  // 5. Product Name Extraction
  let rawTitle = lines[0] || 'Imported Fashion Item';
  rawTitle = rawTitle.replace(/\p{Extended_Pictographic}/gu, '').trim();
  if (rawTitle.length < 4 || /^(available|new|order|dm|call|contact|price|free)/i.test(rawTitle)) {
    rawTitle = lines[1] || `${category === 'Shoes' ? 'Urban Footwear' : 'Classic Apparel'}`;
    rawTitle = rawTitle.replace(/\p{Extended_Pictographic}/gu, '').trim();
  }

  const name = rawTitle.length > 50 ? rawTitle.slice(0, 48) + '…' : rawTitle || 'Addis Imported Item';
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `item-${Date.now().toString(36)}`;

  return {
    name,
    slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
    price,
    compareAtPrice: undefined,
    currency: 'ETB',
    sizes,
    colors,
    colorHex,
    category,
    description: '',
    shortDescription: '',
    tags: [category.toLowerCase(), 'telegram-import', channelName.toLowerCase()],
    stock: 10,
    isFeatured: false,
    isNew: true,
  };
}
