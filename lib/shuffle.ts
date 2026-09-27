export function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  const random = () => {
    hash = (hash * 16807) % 2147483647;
    if (hash <= 0) hash += 2147483647;
    if (hash === 0) hash = 1;
    return (hash - 1) / 2147483646;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    if (j < 0 || j > i) continue;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
