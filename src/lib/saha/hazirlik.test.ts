import { describe, expect, it } from 'vitest';
import katalog from '@/lib/termin/katalog.json';
import { terminleriHesapla } from '@/lib/veri/terminler';
import type { Tesis, TesisYukumlulukSatiri, YukumlulukTuruSatiri } from '@/lib/veri/tipler';
import { hazirlikListesi } from './hazirlik';

const turler = katalog.map((k, i) => ({ ...k, id: `tur-${k.kod}`, sira: i })) as unknown as YukumlulukTuruSatiri[];
const tesis = { id: 't1', gt_kod: 'GT-020', kisa_ad: 'Panab Van', sozlesme_tarihi: '2025-02-01' } as Tesis;
const kayit = (kod: string, alan: Partial<TesisYukumlulukSatiri>): TesisYukumlulukSatiri => ({
  id: `k-${kod}`, tesis_id: 't1', tur_id: `tur-${kod}`, etiket: '', durum: 'aktif', gecerlilik_bitis: null, belge_tarihi: null,
  son_islem: null, baslangic: null, parametreler: {}, sorumlu_id: null, notlar: null, ...alan,
});

describe('hazırlık listesi', () => {
  const terminler = terminleriHesapla(
    [
      kayit('mss', { gecerlilik_bitis: '2026-10-05' }),           // gecikmiş, riskli
      kayit('depo_gazi', {}),                                      // veri eksik
      kayit('gfb_izin', { gecerlilik_bitis: '2030-09-15' }),       // planlı → listede yok
    ],
    turler,
    [tesis],
    [],
    '2026-11-03',
  );
  const liste = hazirlikListesi({
    terminler,
    gorevler: [{ id: 'g', baslik: 'Depo gazı kayıtlarını iste', durum: 'acik', son_tarih: '2026-10-23' } as never],
    acikBulgular: [{ bulgu: 'Etiketsiz varil', termin: '2026-11-10', ziyaretTarihi: '2026-06-11' }],
  });
  const basliklar = liste.map((b) => b.baslik);

  it('gecikmiş riskli yükümlülük kritik olarak ve ne isteneceğiyle gelir', () => {
    const m = liste[0].maddeler[0];
    expect(liste[0].baslik).toBe('Gecikmiş ve yaklaşan yükümlülükler');
    expect(m.metin).toMatch(/Mali Sorumluluk Sigortası/);
    expect(m.metin).toMatch(/poliçe/);
    expect(m.kritik).toBe(true);
    expect(liste[0].maddeler).toHaveLength(1); // planlı GFB yok
  });

  it('veri eksikleri, açık bulgular, görevler ve sabit kontroller ayrı bölümlerde', () => {
    expect(basliklar).toEqual([
      'Gecikmiş ve yaklaşan yükümlülükler',
      'Sistemde eksik bilgi — sahada sor',
      'Önceki ziyaretlerden açık bulgular',
      'Bu tesisle ilgili açık görevler',
      'Her ziyarette',
    ]);
  });

  it('depo gazı yükümlülüğü olan tesiste ölçüm noktası kontrolü eklenir', () => {
    expect(liste.at(-1)!.maddeler.some((m) => /depo gazı ölçüm noktaları/.test(m.metin))).toBe(true);
  });
});
