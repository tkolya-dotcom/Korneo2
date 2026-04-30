export type AddressLike = Record<string, unknown>;

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const addressSignature = (item: AddressLike) =>
  [
    item.address,
    item.emts,
    item.servisnyy_id,
    item.sk_name,
    item.district,
    item.source,
  ]
    .map((part) => normalize(part))
    .filter(Boolean)
    .join(' | ');

export const searchAddressSuggestions = (
  items: AddressLike[],
  query: string,
  limit = 30
) => {
  const list = Array.isArray(items) ? items : [];
  const q = normalize(query);
  const seen = new Set<string>();

  const matched = list
    .filter((item) => {
      const signature = addressSignature(item);
      if (!signature) {
        return false;
      }
      if (!q) {
        return true;
      }
      return signature.includes(q);
    })
    .filter((item) => {
      const key = normalize(item.address) || normalize(item.source_id) || normalize(item.id);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit);

  return matched;
};
