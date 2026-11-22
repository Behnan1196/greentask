import 'server-only';
import type { Depo } from '@/lib/veri/tipler';
import { ayarlariAl, satirdanFaaliyet } from './form';
import { hesapla, type Sonuc } from './motor';

/** Rapor ve dışa aktarım için envanteri, tesisi ve sonucu (kilitliyse dondurulmuş sonucu) yükler. */
export async function envanterPaketi(depo: Depo, id: string) {
  const env = await depo.envanter(id);
  if (!env) return null;
  const [faaliyetler, tesisler, ekip] = await Promise.all([depo.faaliyetler(id), depo.tesisler({ pasiflerDahil: true }), depo.kullanicilar()]);
  const sonuc: Sonuc = env.durum === 'kilitli' && env.kilit_sonucu ? (env.kilit_sonucu as Sonuc) : hesapla(faaliyetler.map(satirdanFaaliyet), ayarlariAl(env));
  return {
    env,
    faaliyetler,
    sonuc,
    tesis: tesisler.find((t) => t.id === env.tesis_id) ?? null,
    hazirlayan: ekip.find((k) => k.id === env.hazirlayan_id)?.ad_soyad ?? null,
  };
}
