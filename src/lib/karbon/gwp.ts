// Küresel ısınma potansiyelleri (100 yıl). Kaynak: GHG Protocol, Ağustos 2024 (IPCC AR5 / AR6).
import type { KaynakKodu } from './kaynaklar';

export type GwpSeti = 'AR5' | 'AR6';

/** Tek bileşenli gazlar. CH₄ AR6'da fosil ve fosil olmayan kaynak için ayrı verilir. */
export const GWP: Record<string, Record<GwpSeti, number>> = {
  CO2: { AR5: 1, AR6: 1 },
  CH4_fosil: { AR5: 28, AR6: 29.8 },
  CH4_biyojenik: { AR5: 28, AR6: 27.0 },
  N2O: { AR5: 265, AR6: 273 },
  'HFC-23': { AR5: 12400, AR6: 14600 },
  'HFC-32': { AR5: 677, AR6: 771 },
  'HFC-125': { AR5: 3170, AR6: 3740 },
  'HFC-134a': { AR5: 1300, AR6: 1530 },
  'HFC-143a': { AR5: 4800, AR6: 5810 },
  'HFC-152a': { AR5: 138, AR6: 164 },
  'HFC-227ea': { AR5: 3350, AR6: 3600 },
  SF6: { AR5: 23500, AR6: 24300 },
  NF3: { AR5: 16100, AR6: 17400 },
  'PFC-14': { AR5: 6630, AR6: 7380 },
};

/** Soğutucu karışımlar: kütlece bileşim (ASHRAE 34). */
export const KARISIMLAR: Record<string, Record<string, number>> = {
  'R-404A': { 'HFC-125': 0.44, 'HFC-143a': 0.52, 'HFC-134a': 0.04 },
  'R-407C': { 'HFC-32': 0.23, 'HFC-125': 0.25, 'HFC-134a': 0.52 },
  'R-410A': { 'HFC-32': 0.5, 'HFC-125': 0.5 },
  'R-507A': { 'HFC-125': 0.5, 'HFC-143a': 0.5 },
};

/** Kullanıcıya gösterilen soğutucu / F-gaz listesi (kod → görünen ad). */
export const SOGUTUCULAR: Record<string, string> = {
  'R-32': 'R-32 (HFC-32)',
  'R-134a': 'R-134a (HFC-134a)',
  'R-125': 'R-125 (HFC-125)',
  'R-143a': 'R-143a (HFC-143a)',
  'R-404A': 'R-404A',
  'R-407C': 'R-407C',
  'R-410A': 'R-410A',
  'R-507A': 'R-507A',
  'R-227ea': 'HFC-227ea (FM-200 söndürücü)',
  SF6: 'SF₆ (orta gerilim hücreleri)',
};

const TEK: Record<string, string> = {
  'R-32': 'HFC-32',
  'R-134a': 'HFC-134a',
  'R-125': 'HFC-125',
  'R-143a': 'HFC-143a',
  'R-227ea': 'HFC-227ea',
  SF6: 'SF6',
};

/** Bir soğutucunun KÜP'ü ve dayandığı kaynaklar. */
export function sogutucuGwp(kod: string, set: GwpSeti): { gwp: number; kaynaklar: KaynakKodu[]; aciklama: string } {
  const tek = TEK[kod];
  if (tek) return { gwp: GWP[tek][set], kaynaklar: ['GHGP_GWP_2024'], aciklama: `${tek} KÜP (${set}) = ${GWP[tek][set]}` };
  const k = KARISIMLAR[kod];
  if (!k) throw new Error(`Tanımsız soğutucu: ${kod}`);
  const gwp = Object.entries(k).reduce((t, [g, oran]) => t + oran * GWP[g][set], 0);
  const aciklama = `${kod} = ${Object.entries(k)
    .map(([g, oran]) => `%${Math.round(oran * 100)} ${g} (${GWP[g][set]})`)
    .join(' + ')} = ${yuvarla(gwp, 1)}`;
  return { gwp, kaynaklar: ['GHGP_GWP_2024', 'ASHRAE34'], aciklama };
}

export const yuvarla = (x: number, b = 3) => Math.round(x * 10 ** b) / 10 ** b;
