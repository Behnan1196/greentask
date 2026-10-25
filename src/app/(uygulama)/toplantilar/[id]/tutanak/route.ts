import { trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { devredenGorevler } from '@/lib/veri/toplanti';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DURUM: Record<string, string> = { acik: 'Açık', devam: 'Devam ediyor', tamamlandi: 'Tamamlandı', iptal: 'İptal' };

// Toplantı tutanağı: 05_Toplanti_Notlari klasörünün adlandırmasıyla (TARIH_ToplantiNotu.md) indirilir.
export async function GET(_req: Request, ctx: RouteContext<'/toplantilar/[id]/tutanak'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response('Bulunamadı', { status: 404 });
  const toplanti = await depo.toplanti(id);
  if (!toplanti) return new Response('Bulunamadı', { status: 404 });

  const [maddeler, toplantilar, gorevler, ekip, tesisler] = await Promise.all([
    depo.maddeler(id),
    depo.toplantilar(),
    depo.gorevler({ toplantidan: true }),
    depo.kullanicilar(),
    depo.tesisler(),
  ]);
  const adi = new Map(ekip.map((k) => [k.id, k.ad_soyad]));
  const tesisAdi = new Map(tesisler.map((t) => [t.id, `${t.gt_kod} ${t.kisa_ad}`]));
  const tarihi = new Map(toplantilar.map((t) => [t.id, t.tarih]));
  const gorevSatiri = (g: (typeof gorevler)[number]) =>
    `- [${g.durum === 'tamamlandi' ? 'x' : ' '}] ${g.baslik} — ${adi.get(g.sorumlu_id ?? '') ?? 'Atanmamış'}` +
    `${g.son_tarih ? ` — ${trTarih(g.son_tarih)}` : ''} (${DURUM[g.durum]})`;

  const s: string[] = [`# ${toplanti.baslik} — ${trTarih(toplanti.tarih)}`, ''];
  if (toplanti.notlar) s.push(toplanti.notlar, '');

  s.push('## Gündem', '');
  maddeler.forEach((m, i) => {
    s.push(`### ${i + 1}. ${m.baslik}${m.tesis_id ? ` (${tesisAdi.get(m.tesis_id)})` : ''}`, '');
    if (m.karar) s.push(`**Görüşülen / karar:** ${m.karar}`, '');
    const mg = gorevler.filter((g) => g.toplanti_maddesi_id === m.id);
    if (mg.length) s.push('**Görevler:**', ...mg.map(gorevSatiri), '');
  });
  if (!maddeler.length) s.push('_Gündem maddesi yok._', '');

  const devreden = devredenGorevler(gorevler, toplantilar, toplanti);

  if (devreden.length) {
    s.push('## Önceki toplantılardan devreden açık görevler', '');
    s.push(...devreden.map((g) => `${gorevSatiri(g)} · ${trTarih(tarihi.get(g.toplanti_id!) ?? null)} toplantısı`), '');
  }
  s.push(`_Greentask İş Sistemi tarafından oluşturuldu._`, '');

  return new Response(s.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${toplanti.tarih}_ToplantiNotu.md"`,
    },
  });
}
