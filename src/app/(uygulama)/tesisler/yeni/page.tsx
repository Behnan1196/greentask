import type { Metadata } from 'next';
import Link from 'next/link';
import { oturumuDogrula } from '@/lib/veri/depo';
import { tesisOlustur } from '../eylemler';
import { ANA, GIRDI, KisiAlanlariFormu, TesisAlanlariFormu, grupSirasi } from '../tesis-formu';
import { GrupVeYukumlulukler } from './secim';

export const metadata: Metadata = { title: 'Yeni tesis' };

export default async function YeniTesis() {
  const { depo, kullanici } = await oturumuDogrula();
  const [tesisler, gruplar, turler, kayitlar, ekip] = await Promise.all([
    depo.tesisler({ pasiflerDahil: true }),
    depo.sektorGruplari(),
    depo.turler(),
    depo.yukumlulukler(),
    depo.kullanicilar(),
  ]);
  const sonNo = Math.max(0, ...tesisler.map((t) => Number(t.gt_kod.slice(3)) || 0));
  const onerilenKod = `GT-${String(sonNo + 1).padStart(3, '0')}`;

  // Her grup için: o gruptaki aktif tesislerin en az yarısında takip edilen yükümlülük türleri
  const aktifTesisler = tesisler.filter((t) => t.aktif);
  const oneriler: Record<string, string[]> = {};
  const grupBilgisi = [...gruplar].sort(grupSirasi).map((g) => {
    const uyeler = aktifTesisler.filter((t) => t.grup_kod === g.kod);
    const uyeIdleri = new Set(uyeler.map((t) => t.id));
    oneriler[g.kod] = turler
      .filter((tur) => {
        const sahip = new Set(kayitlar.filter((k) => k.tur_id === tur.id && k.durum === 'aktif' && uyeIdleri.has(k.tesis_id ?? '')).map((k) => k.tesis_id));
        return uyeler.length > 0 && sahip.size / uyeler.length >= 0.5;
      })
      .map((t) => t.id);
    return { kod: g.kod, ad: g.ad, tesisSayisi: uyeler.length };
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/tesisler" className="text-sm no-underline">
        ← Tesisler
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Yeni tesis</h1>
      <form action={tesisOlustur} className="flex max-w-5xl flex-col gap-5">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <h2 className="col-span-full text-base font-semibold">Tesis bilgileri</h2>
          <label className="flex flex-col gap-1 text-sm font-medium">
            GT kodu
            <input name="gt_kod" required defaultValue={onerilenKod} pattern="GT-[0-9]{3}" title="GT-000 biçiminde" className={`${GIRDI} font-mono`} />
          </label>
          <TesisAlanlariFormu gruplar={gruplar} grupAlaniGoster={false} />
          <label className="flex flex-col gap-1 text-sm">
            Greentask sorumlusu
            <select name="sorumlu_id" defaultValue={kullanici.id} className={GIRDI}>
              <option value="">Atanmamış</option>
              {ekip.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad_soyad}
                </option>
              ))}
            </select>
          </label>
          <GrupVeYukumlulukler gruplar={grupBilgisi} turler={turler.map((t) => ({ id: t.id, ad: t.ad, aciklama: t.aciklama }))} oneriler={oneriler} />
        </section>
        <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <h2 className="col-span-full text-base font-semibold">
            İlk yetkili <span className="text-sm font-normal text-soluk">(isteğe bağlı; diğerlerini tesis kartından eklersiniz)</span>
          </h2>
          <KisiAlanlariFormu zorunlu={false} />
        </section>
        <button className={`${ANA} self-start`}>Tesisi oluştur</button>
      </form>
    </div>
  );
}
