// Helper to deterministically derive a UUID from a product name.
export const productIdFromName = (name: string) => {
  const s = name;
  let h1 = 0n;
  let h2 = 1n;
  for (let i = 0; i < s.length; i++) {
    const c = BigInt(s.charCodeAt(i));
    h1 = (h1 * 1099511628211n) ^ c; // FNV-like
    h2 = (h2 * 1469598103934665603n) ^ c;
  }
  const toHex = (n: bigint) => (n < 0n ? (-n).toString(16) : n.toString(16));
  const hex = (toHex(h1).padStart(16, "0") + toHex(h2).padStart(16, "0")).slice(-32);
  const parts = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "5" + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ];
  return parts.join("-");
};

