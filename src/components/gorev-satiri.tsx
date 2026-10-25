import { gorevDurumunuDegistir } from '@/app/(uygulama)/toplantilar/eylemler';
import { gunFarki, trTarih } from '@/lib/termin/tarih';
import type { Gorev } from '@/lib/veri/tipler';

const DURUM = {
  acik: { ad: 'Açık', sinif: 'bg-gri-zemin text-gri' },
  devam: { ad: 'Devam ediyor', sinif: 'bg-turuncu-zemin text-turuncu' },
  tamamlandi: { ad: 'Tamamlandı', sinif: 'bg-yesil-acik text-yesil-koyu' },
  iptal: { ad: 'İptal', sinif: 'bg-gri-zemin text-soluk' },
} as const;

const KUCUK_BUTON = 'min-h-8 rounded-md border border-[#c9cec6] bg-white px-2.5 text-xs';

/** Görev satırı: durum, kişi, tarih ve hızlı durum değiştirme. */
export function GorevSatiri({ g, bugun, kisi, ek }: { g: Gorev; bugun: string; kisi?: string; ek?: string }) {
  const kalan = g.son_tarih ? gunFarki(bugun, g.son_tarih) : null;
  const gecikti = kalan != null && kalan < 0 && (g.durum === 'acik' || g.durum === 'devam');
  const d = gecikti ? { ad: 'Gecikti', sinif: 'bg-kirmizi-zemin text-kirmizi' } : DURUM[g.durum];
  const kapali = g.durum === 'tamamlandi' || g.durum === 'iptal';
  return (
    <div className={`flex flex-wrap items-start gap-x-3 gap-y-2 py-2.5 ${kapali ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-[1_1_220px]">
        <p className={`text-sm font-medium ${kapali ? 'line-through' : ''}`}>{g.baslik}</p>
        <p className="text-xs text-soluk">
          {[kisi, g.son_tarih ? trTarih(g.son_tarih) + (gecikti ? ` · ${-kalan!} gün geçti` : '') : 'Tarihsiz', ek].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${d.sinif}`}>{d.ad}</span>
      {!kapali && (
        <div className="flex gap-1.5">
          {g.durum === 'acik' && (
            <form action={gorevDurumunuDegistir}>
              <input type="hidden" name="id" value={g.id} />
              <input type="hidden" name="durum" value="devam" />
              <button className={KUCUK_BUTON}>Başladım</button>
            </form>
          )}
          <form action={gorevDurumunuDegistir}>
            <input type="hidden" name="id" value={g.id} />
            <input type="hidden" name="durum" value="tamamlandi" />
            <button className={`${KUCUK_BUTON} border-yesil text-yesil-koyu`}>Tamamlandı</button>
          </form>
        </div>
      )}
    </div>
  );
}
