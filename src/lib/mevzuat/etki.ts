// Mevzuat değişikliğinin hangi tesisleri etkilediğini serbest metinden çözer.
// Excel'deki "Etkilenen gruplar / tesisler" sütunları serbest metindi ("G1,G5", "G1,G2,G3...(tümü)", "Tüm portföy — özellikle GT-001").
import type { MatrisHucresi, Mevzuat, MevzuatDegisikligi, Tesis } from '@/lib/veri/tipler';

export type EtkiNedeni = 'grup' | 'kod' | 'tum';
export type Etkilenen = { tesis: Tesis; neden: EtkiNedeni; onerilen: boolean };

const TUMU = /t[üu]m[üu]|t[üu]m portf[öo]y|t[üu]m tesis/i;

export function gruplariCoz(metin: string | null, tumGruplar: string[]): string[] {
  if (!metin) return [];
  if (TUMU.test(metin)) return [...tumGruplar];
  const bulunan = new Set([...metin.matchAll(/\bG(\d{1,2})\b/g)].map((m) => `G${Number(m[1])}`));
  return tumGruplar.filter((g) => bulunan.has(g));
}

export const tesisKodlari = (metin: string | null) => [...new Set([...(metin ?? '').matchAll(/\bGT-?(\d{3})\b/gi)].map((m) => `GT-${m[1]}`))];

/**
 * Aday tesisler ve neden etkilendikleri. Grup "tümü" ise hepsi önerilir. Grup ya da tesis kodu açıkça yazılmışsa öneri odur;
 * yalnızca "tüm portföy" denmişse tüm tesisler önerilir. Grup/kod varken "tüm portföy" de yazıyorsa
 * diğer tesisler listelenir ama önerilmez (kullanıcı seçer).
 */
export function etkilenenTesisler(d: Pick<MevzuatDegisikligi, 'etkilenen_gruplar' | 'etkilenen_tesisler'>, tesisler: Tesis[], tumGruplar: string[]): Etkilenen[] {
  const tumGrupMu = TUMU.test(d.etkilenen_gruplar ?? '');
  const gruplar = new Set(tumGrupMu ? [] : gruplariCoz(d.etkilenen_gruplar, tumGruplar));
  const kodlar = new Set(tesisKodlari(d.etkilenen_tesisler));
  const tumu = tumGrupMu || TUMU.test(d.etkilenen_tesisler ?? '');
  const belirli = !tumGrupMu && (gruplar.size > 0 || kodlar.size > 0);
  const sonuc: Etkilenen[] = [];
  for (const t of tesisler) {
    if (kodlar.has(t.gt_kod)) sonuc.push({ tesis: t, neden: 'kod', onerilen: true });
    else if (t.grup_kod && gruplar.has(t.grup_kod)) sonuc.push({ tesis: t, neden: 'grup', onerilen: true });
    else if (tumu) sonuc.push({ tesis: t, neden: 'tum', onerilen: !belirli });
  }
  return sonuc;
}

/** Değişikliği kütüphanedeki mevzuata RG sayısıyla eşler (bağlantı girilmemişse). */
export function mevzuatiBul(d: Pick<MevzuatDegisikligi, 'mevzuat_id' | 'rg_metin' | 'ad'>, mevzuatlar: Mevzuat[]): Mevzuat | null {
  if (d.mevzuat_id) return mevzuatlar.find((m) => m.id === d.mevzuat_id) ?? null;
  const sayi = /\b(\d{5})\b/.exec(d.rg_metin ?? '')?.[1];
  return (sayi && mevzuatlar.find((m) => m.rg_sayi === sayi || (m.rg_metin ?? '').includes(sayi))) || null;
}

/** Bir tesise uygulanan mevzuat (sektör grubu üzerinden). X: doğrudan, K: koşullu. */
export function tesisMevzuati(tesis: Pick<Tesis, 'grup_kod'>, mevzuatlar: Mevzuat[], matris: MatrisHucresi[]) {
  const hucre = new Map(matris.filter((h) => h.grup_kod === tesis.grup_kod).map((h) => [h.mevzuat_id, h.uygulama]));
  return mevzuatlar.filter((m) => hucre.has(m.id)).map((m) => ({ mevzuat: m, uygulama: hucre.get(m.id)! }));
}
