export function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function diceCoefficient(a: string, b: string): number {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x.length || !y.length) return 0;
  if (x === y) return 1;

  const bi = (value: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < value.length - 1; i += 1) {
      const token = value.slice(i, i + 2);
      map.set(token, (map.get(token) ?? 0) + 1);
    }
    return map;
  };

  const bx = bi(x);
  const by = bi(y);
  let overlap = 0;
  bx.forEach((count, token) => {
    overlap += Math.min(count, by.get(token) ?? 0);
  });

  return (2 * overlap) / (Math.max(x.length - 1, 0) + Math.max(y.length - 1, 0));
}
