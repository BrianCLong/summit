import murmurhash from 'imurmurhash';
export function bucket(userId: string, exp: string) {
  const h = murmurhash(userId + ':' + exp).result() % 10000;
  return h / 100 < 10 ? 'B' : 'A'; // 10% to B
}
