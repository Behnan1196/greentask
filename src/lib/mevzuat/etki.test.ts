import { describe, expect, it } from 'vitest';
import type { Mevzuat, Tesis } from '@/lib/veri/tipler';
import { etkilenenTesisler, gruplariCoz, mevzuatiBul, tesisKodlari, tesisMevzuati } from './etki';

const G = ['G1', 'G2', 'G3', 'G5', 'G10'];
const t = (gt_kod: string, grup_kod: string) => ({ id: gt_kod, gt_kod, grup_kod, kisa_ad: gt_kod }) as Tesis;
const TESISLER = [t('GT-001', 'G1'), t('GT-002', 'G2'), t('GT-020', 'G5'), t('GT-021', 'G5'), t('GT-025', 'G10')];

describe('etki çözümleme', () => {
  it('grup metnini çözer', () => {
    expect(gruplariCoz('G1,G5', G)).toEqual(['G1', 'G5']);
    expect(gruplariCoz('G1, G3, G5 (ısınma ve enerji kullanımı olan tesisin)', G)).toEqual(['G1', 'G3', 'G5']);
    expect(gruplariCoz('G1,G2,G3...(tümü)', G)).toEqual(G);
    expect(gruplariCoz('G10', G)).toEqual(['G10']);
    expect(gruplariCoz(null, G)).toEqual([]);
  });
  it('tesis kodlarını çözer', () => {
    expect(tesisKodlari('GT-001 (Enerjisa TFB), GT-020 (Panda Van), gt-021')).toEqual(['GT-001', 'GT-020', 'GT-021']);
  });
  it('grup + kod: yalnızca onlar önerilir, "tüm portföy" diğerlerini önermeden listeler', () => {
    const e = etkilenenTesisler({ etkilenen_gruplar: 'G1, G5', etkilenen_tesisler: 'Tüm portföy (özellikle ısınma yakıtı kullananlar)' }, TESISLER, G);
    expect(e.filter((x) => x.onerilen).map((x) => x.tesis.gt_kod)).toEqual(['GT-001', 'GT-020', 'GT-021']);
    expect(e.find((x) => x.tesis.gt_kod === 'GT-002')).toMatchObject({ neden: 'tum', onerilen: false });
  });
  it('yalnızca "tümü": hepsi önerilir', () => {
    const e = etkilenenTesisler({ etkilenen_gruplar: 'G1,G2,G3...(tümü)', etkilenen_tesisler: 'Tüm portföy — özellikle G1 GT-001' }, TESISLER, G);
    expect(e.filter((x) => x.onerilen)).toHaveLength(5);
    expect(e[0].neden).toBe('kod');
  });
  it('kütüphane eşleme ve tesis mevzuatı', () => {
    const m = [{ id: 'a', rg_sayi: '32951', rg_metin: '09.07.2025 / 32951' }, { id: 'b', rg_sayi: null, rg_metin: null }] as Mevzuat[];
    expect(mevzuatiBul({ mevzuat_id: null, rg_metin: '09.07.2025 / 32951', ad: 'İklim' }, m)?.id).toBe('a');
    expect(mevzuatiBul({ mevzuat_id: null, rg_metin: 'Taslak', ad: 'x' }, m)).toBeNull();
    expect(tesisMevzuati({ grup_kod: 'G2' }, m, [{ mevzuat_id: 'b', grup_kod: 'G2', uygulama: 'K' }])).toEqual([{ mevzuat: m[1], uygulama: 'K' }]);
  });
});
