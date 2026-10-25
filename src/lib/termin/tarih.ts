// Takvim günü aritmetiği. Tüm tarihler 'YYYY-MM-DD' metni olarak taşınır (saat dilimi yok),
// böylece sunucu ve tarayıcı arasında gün kayması olmaz.

export type Gun = string; // 'YYYY-MM-DD'

const GUN_MS = 86_400_000;

function parcala(g: Gun): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(g);
  if (!m) throw new Error(`Geçersiz tarih: ${g}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function utc(g: Gun): number {
  const [y, a, d] = parcala(g);
  return Date.UTC(y, a - 1, d);
}

function bicimle(ms: number): Gun {
  return new Date(ms).toISOString().slice(0, 10);
}

export function gunEkle(g: Gun, n: number): Gun {
  return bicimle(utc(g) + n * GUN_MS);
}

/** Excel EDATE ile aynı: ay ekler, ayın son gününe kırpar (31 Ocak + 1 ay = 28/29 Şubat). */
export function ayEkle(g: Gun, n: number): Gun {
  const [y, a, d] = parcala(g);
  const hedefAy = a - 1 + n;
  const yil = y + Math.floor(hedefAy / 12);
  const ay = ((hedefAy % 12) + 12) % 12;
  const sonGun = new Date(Date.UTC(yil, ay + 1, 0)).getUTCDate();
  return bicimle(Date.UTC(yil, ay, Math.min(d, sonGun)));
}

/** b - a, gün olarak (Excel'deki C4-TODAY() gibi). */
export function gunFarki(a: Gun, b: Gun): number {
  return Math.round((utc(b) - utc(a)) / GUN_MS);
}

export function enBuyuk(...gunler: (Gun | null | undefined)[]): Gun | null {
  const v = gunler.filter((g): g is Gun => !!g).sort();
  return v.length ? v[v.length - 1] : null;
}

/** İstanbul saatine göre bugünün tarihi. */
export function bugun(simdi: Date = new Date()): Gun {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(simdi);
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function trTarih(g: Gun | null | undefined): string {
  if (!g) return '—';
  const [y, a, d] = parcala(g);
  return `${String(d).padStart(2, '0')}.${String(a).padStart(2, '0')}.${y}`;
}

export function trUzunTarih(g: Gun): string {
  const [y, a, d] = parcala(g);
  return `${d} ${AYLAR[a - 1]} ${y}`;
}
