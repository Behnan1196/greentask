import 'server-only';
import type { Depo, IsletmePlani } from '@/lib/veri/tipler';
import { docxOku } from './docx';
import { planHaritasi, planiTara } from './tarama';

/** Yüklenen Word dosyasını okur, plan haritasını birleştirir, tarama bulgularını yeni sürüme yazar. */
export async function surumuAnalizEt(
  depo: Depo,
  plan: IsletmePlani,
  dosya: { yol: string; dosyaAdi: string; boyut: number },
): Promise<{ surumId: string; bulgu: number; oge: number }> {
  const veri = new Uint8Array(await depo.planDosyasi(dosya.yol));
  let belge;
  try {
    belge = docxOku(veri);
  } catch {
    await depo.planDosyasiSil(dosya.yol);
    throw new Error('Dosya okunamadı. Word’de “Farklı kaydet → Word Belgesi (.docx)” ile kaydedip yeniden deneyin.');
  }
  const tesisler = (await depo.tesisler()).filter((t) => plan.tesis_idleri.includes(t.id));
  const unvanlar = tesisler.map((t) => t.resmi_unvan).filter((u): u is string => !!u);
  const ogeler = planHaritasi(belge);
  const bulgular = planiTara(belge, { unvanlar, yil: new Date().getFullYear() });
  // Önceki sürümde "hata değil" denen bulgu aynen tekrar çıkarsa yine yok sayılır
  const onceki = (await depo.planSurumleri(plan.id))[0];
  const yoksayilan = new Set(
    (onceki ? await depo.planBulgulari(onceki.id) : []).filter((b) => b.durum === 'yoksay').map((b) => `${b.kategori}|${b.baslik}|${b.detay ?? ''}`),
  );
  const surumId = await depo.surumKaydet(
    {
      plan_id: plan.id,
      dosya_adi: dosya.dosyaAdi,
      yol: dosya.yol,
      boyut: dosya.boyut,
      ozet: {
        paragraf: belge.paragraflar.length,
        tablo: belge.tabloSayisi,
        sekil: ogeler.filter((o) => o.tur === 'sekil').length,
        gorsel: belge.gorselSayisi,
        bolum: ogeler.filter((o) => o.tur === 'bolum').length,
        bulgu: bulgular.filter((b) => b.onem !== 'dusuk').length,
      },
    },
    ogeler,
    bulgular.map((b) => ({
      kategori: b.kategori,
      onem: b.onem,
      baslik: b.baslik,
      detay: b.detay ?? null,
      oneri: b.oneri ?? null,
      durum: yoksayilan.has(`${b.kategori}|${b.baslik}|${b.detay ?? ''}`) ? ('yoksay' as const) : ('acik' as const),
    })),
  );
  return { surumId, bulgu: bulgular.filter((b) => b.onem !== 'dusuk').length, oge: ogeler.length };
}
