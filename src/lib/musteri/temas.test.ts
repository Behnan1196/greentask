import { describe, expect, it } from 'vitest';
import type { Gorusme, Kisi, SahaZiyareti, Tesis } from '@/lib/veri/tipler';
import { sonTemaslar, yaklasanDogumGunleri } from './temas';

const tesis = (id: string) => ({ id }) as Tesis;
const kisi = (ad_soyad: string, dogum_gunu: string | null) => ({ id: ad_soyad, ad_soyad, dogum_gunu }) as Kisi;

describe('müşteri teması', () => {
  it('son temas: görüşme ve yapılmış ziyaretlerin en yenisi; planlı ziyaret sayılmaz', () => {
    const m = sonTemaslar(
      [tesis('a'), tesis('b'), tesis('c')],
      [{ tesis_id: 'a', tarih: '2026-09-01' } as Gorusme, { tesis_id: 'x', tarih: '2026-10-01' } as Gorusme],
      [
        { tesis_id: 'a', tarih: '2026-10-10', durum: 'raporlandi' } as SahaZiyareti,
        { tesis_id: 'b', tarih: '2026-11-20', durum: 'planli' } as SahaZiyareti,
      ],
    );
    expect(m.get('a')).toBe('2026-10-10');
    expect(m.get('b')).toBeNull();
    expect(m.has('x')).toBe(false);
  });
  it('yaklaşan doğum günleri yıl dönümünü ve sıralamayı doğru yapar', () => {
    const r = yaklasanDogumGunleri([kisi('A', '1975-11-10'), kisi('B', '1980-11-04'), kisi('C', '1990-12-30'), kisi('D', null)], '2026-11-03');
    expect(r.map((x) => [x.kisi.ad_soyad, x.kalan])).toEqual([
      ['B', 1],
      ['A', 7],
    ]);
    expect(yaklasanDogumGunleri([kisi('E', '1970-01-05')], '2026-12-28').map((x) => x.tarih)).toEqual(['2027-01-05']);
  });
});
