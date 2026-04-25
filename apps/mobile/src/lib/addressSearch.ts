type AddressLike = Record<string, any>;

const normalizePart = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/\u0451/g, '\u0435')
    .replace(/[.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeSearchQuery = (value: unknown) =>
  normalizePart(value)
    .replace(/^emts[:\s-]*/i, '')
    .trim();

const buildTextParts = (item: AddressLike) => {
  const address = normalizePart(item.address);
  const district = normalizePart(item.district);
  const skName = normalizePart(item.sk_name);
  const emts = normalizePart(
    item.servisnyy_id || item.emts_code || item.emts_id || item.object_id || item.id
  );

  return { address, district, skName, emts };
};

const scoreItem = (item: AddressLike, query: string) => {
  const q = normalizeSearchQuery(query);
  if (!q) {
    return 0;
  }

  const { address, district, skName, emts } = buildTextParts(item);
  const joined = `${address} ${district} ${skName} ${emts}`.trim();

  if (!joined.includes(q)) {
    return -1;
  }

  let score = 1;

  if (emts === q) score += 240;
  if (address === q) score += 210;
  if (emts.startsWith(q)) score += 140;
  if (address.startsWith(q)) score += 120;
  if (district.startsWith(q)) score += 95;
  if (skName.startsWith(q)) score += 85;

  if (address.includes(q)) score += 60;
  if (emts.includes(q)) score += 58;
  if (district.includes(q)) score += 42;
  if (skName.includes(q)) score += 34;

  // Shorter direct matches are usually cleaner for dropdown-first search.
  if (address) score += Math.max(0, 20 - Math.min(address.length, 20));
  if (emts) score += Math.max(0, 12 - Math.min(emts.length, 12));

  return score;
};

const dedupeAddresses = (items: AddressLike[]) => {
  const used = new Set<string>();
  return items.filter((item) => {
    const { address, emts } = buildTextParts(item);
    const key = `${address}|${emts}`;
    if (!key.trim() || used.has(key)) {
      return false;
    }
    used.add(key);
    return true;
  });
};

export const searchAddressSuggestions = (
  source: AddressLike[],
  query: string,
  limit = 20
): AddressLike[] => {
  const normalizedQuery = normalizeSearchQuery(query);
  const deduped = dedupeAddresses(source || []);

  if (!normalizedQuery) {
    return deduped.slice(0, limit);
  }

  return deduped
    .map((item) => ({
      item,
      score: scoreItem(item, normalizedQuery),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
};
