import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { YazdirButonu } from '@/app/(uygulama)/saha/[id]/yukleyici';
import { GHGP_KATEGORI_ADI, ISO_KATEGORI_ADI, type IsoKategori } from '@/lib/karbon/adlar';
import { DEFRA } from '@/lib/karbon/defra';
import { KAYNAKLAR, type KaynakKodu } from '@/lib/karbon/kaynaklar';
import { VERI_BELIRSIZLIGI } from '@/lib/karbon/motor';
import { SINIR_ADI, VERI_KALITESI_ADI, pay, ton, yuzde } from '@/lib/karbon/sunum';
import { envanterPaketi } from '@/lib/karbon/yukle';
import { bugun, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sera gazı envanter raporu' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KATLAR = Object.keys(ISO_KATEGORI_ADI) as IsoKategori[];
const th = 'border-b border-murekkep py-1.5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-murekkep-2';
const td = 'border-b border-cizgi py-1.5 pr-3 align-top';
const sag = 'text-right font-mono';

// TS EN ISO 14064-1:2018 madde 9.3'te sayılan rapor içeriğine göre düzenlenmiş, yazdırılabilir envanter raporu.
export default async function KarbonRaporu(props: PageProps<'/karbon-rapor/[id]'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const p = await envanterPaketi(depo, id);
  if (!p) notFound();
  const { env, sonuc: s, tesis, hazirlayan, faaliyetler } = p;
  const kanit = new Map(faaliyetler.map((f) => [f.id, f]));
  const kaynaklar = [...new Set(s.satirlar.flatMap((r) => r.kaynaklar))].sort() as KaynakKodu[];
  const kapsam3 = new Set(s.satirlar.filter((r) => r.kapsam === 3).map((r) => r.ghgp_kategori));
  const unvan = tesis?.resmi_unvan ?? tesis?.kisa_ad ?? '—';

  return (
    <main className="mx-auto max-w-[900px] bg-white px-10 py-10 text-[13px] leading-relaxed text-murekkep print:max-w-none print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm 14mm; } @media print { body { background: #fff; } }`}</style>
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <a href={`/karbon/${id}`} className="text-sm no-underline">
          ← Envantere dön
        </a>
        <YazdirButonu etiket="Yazdır / PDF olarak kaydet" />
      </div>
      {env.durum !== 'kilitli' && (
        <p className="mb-4 rounded-md bg-turuncu-zemin px-3 py-2 text-xs font-semibold text-turuncu">TASLAK — envanter kilitlenmeden önceki hesap. Değerler değişebilir.</p>
      )}

      <header className="border-b-2 border-murekkep pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-yesil-koyu">Greentask Enerji Danışmanlık</p>
        <h1 className="text-2xl font-semibold">Kurumsal Sera Gazı Envanter Raporu</h1>
        <p className="text-sm text-murekkep-2">
          {unvan} · {env.yil} · TS EN ISO 14064-1:2018
        </p>
      </header>

      <Bolum no="1" baslik="Raporlayan kuruluş ve dönem">
        <table className="w-full border-collapse">
          <tbody>
            {[
              ['Kuruluş', unvan],
              ['Adres / il', tesis?.il ?? '—'],
              ['NACE', tesis?.nace_kodlari ?? '—'],
              ['Raporlama dönemi', `01.01.${env.yil} – 31.12.${env.yil}`],
              ['Baz yıl', `${env.baz_yil ?? env.yil}${!env.baz_yil || env.baz_yil === env.yil ? ' (ilk envanter; baz yıl olarak bu yıl seçilmiştir)' : ''}`],
              ['Raporu hazırlayan', `${hazirlayan ?? '—'} · Greentask Enerji Danışmanlık`],
              ['Rapor tarihi', env.kilit_zamani ? new Date(env.kilit_zamani).toLocaleDateString('tr-TR') : `${trTarih(bugun())} (taslak)`],
            ].map(([a, b]) => (
              <tr key={a}>
                <th className="w-44 border-b border-cizgi py-1.5 pr-4 text-left font-medium text-soluk">{a}</th>
                <td className={td}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bolum>

      <Bolum no="2" baslik="Sınırlar">
        <p>
          <b>Kuruluş sınırı:</b> {SINIR_ADI[env.sinir_yaklasimi]} yaklaşımı. {env.sinir_aciklamasi}
        </p>
        <p className="mt-2">
          <b>Raporlama sınırı:</b> Kategori 1 ve 2 emisyonlarının tamamı; Kategori 3–6’da sayısallaştırılan kalemler aşağıdaki tabloda verilmiştir. Kapsanan GHG
          Protocol Kapsam 3 kategorileri: {[...kapsam3].filter(Boolean).sort((a, b) => a! - b!).map((k) => `${k}. ${GHGP_KATEGORI_ADI[k!]}`).join('; ') || '—'}.
        </p>
        <p className="mt-2">
          <b>Hariç tutulanlar:</b> {env.haric_tutulanlar ?? 'Belirtilmemiştir.'}
        </p>
      </Bolum>

      <Bolum no="3" baslik="Sonuçlar">
        <p className="text-base">
          Toplam sera gazı emisyonu: <b className="font-mono">{ton(s.toplam)} t CO₂e</b> (belirsizlik {yuzde(s.belirsizlik.toplam)}, %95 güven aralığı).
        </p>
        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>ISO 14064-1 kategorisi</th>
              <th className={`${th} text-right`}>t CO₂e</th>
              <th className={`${th} text-right`}>Pay</th>
              <th className={`${th} text-right`}>Belirsizlik</th>
            </tr>
          </thead>
          <tbody>
            {KATLAR.map((k) => (
              <tr key={k}>
                <td className={td}>{ISO_KATEGORI_ADI[k]}</td>
                <td className={`${td} ${sag}`}>{ton(s.kategori[k])}</td>
                <td className={`${td} text-right`}>{pay(s.kategori[k], s.toplam)}</td>
                <td className={`${td} text-right`}>{s.kategori[k] ? yuzde(s.belirsizlik.kategori[k]) : '—'}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className={td}>Toplam</td>
              <td className={`${td} ${sag}`}>{ton(s.toplam)}</td>
              <td className={`${td} text-right`}>%100</td>
              <td className={`${td} text-right`}>{yuzde(s.belirsizlik.toplam)}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-5 font-semibold">GHG Protocol kapsamlarına göre</h3>
        <table className="mt-1 w-full border-collapse">
          <tbody>
            <tr>
              <td className={td}>Kapsam 1 · doğrudan</td>
              <td className={`${td} ${sag}`}>{ton(s.kapsam[1])} t</td>
            </tr>
            <tr>
              <td className={td}>Kapsam 2 · konum esaslı</td>
              <td className={`${td} ${sag}`}>{ton(s.kapsam[2])} t</td>
            </tr>
            <tr>
              <td className={td}>Kapsam 2 · piyasa esaslı (YEK-G belgeli tüketim sıfır, kalan konum faktörüyle)</td>
              <td className={`${td} ${sag}`}>{ton(s.kapsam2_piyasa)} t</td>
            </tr>
            <tr>
              <td className={td}>Kapsam 3 · diğer dolaylı</td>
              <td className={`${td} ${sag}`}>{ton(s.kapsam[3])} t</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-5 font-semibold">Doğrudan emisyonların gazlara göre dağılımı (Kategori 1)</h3>
        <table className="mt-1 w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Gaz</th>
              <th className={`${th} text-right`}>Kütle, t</th>
              <th className={`${th} text-right`}>t CO₂e</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const k1 = s.satirlar.filter((r) => r.iso_kategori === '1');
              const kutle = (g: 'CO2' | 'CH4' | 'N2O') => k1.reduce((t, r) => t + r.gazlar[g], 0);
              const esd = (g: 'CO2' | 'CH4' | 'N2O' | 'F' | 'diger') => k1.reduce((t, r) => t + (r.gaz_co2e?.[g] ?? 0), 0);
              const satir: [string, string, number][] = [
                ['CO₂ (fosil)', ton(kutle('CO2'), 3), esd('CO2')],
                ['CH₄', ton(kutle('CH4'), 5), esd('CH4')],
                ['N₂O', ton(kutle('N2O'), 5), esd('N2O')],
                ['HFC / PFC / SF₆ / NF₃', '—', esd('F')],
              ];
              if (esd('diger') > 0) satir.push(['Gazlara ayrıştırılmamış (özel faktör)', '—', esd('diger')]);
              return satir.map(([ad, k, e]) => (
                <tr key={ad}>
                  <td className={td}>{ad}</td>
                  <td className={`${td} ${sag}`}>{k}</td>
                  <td className={`${td} ${sag}`}>{ton(e, 3)}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
        <p className="mt-3">
          <b>Biyojenik CO₂</b> (toplama dahil değildir): {ton(s.biyojenik_co2, 3)} t. <b>Uzaklaştırmalar</b> (yutak): raporlanmamıştır.
        </p>
      </Bolum>

      <Bolum no="4" baslik="Hesaplama yöntemi ve faktörler">
        <p>
          Emisyonlar faaliyet verisi × emisyon faktörü yöntemiyle hesaplanmıştır. Yakıtlarda miktar alt ısıl değer esaslı enerjiye (TJ) çevrilmiş; CO₂ için
          Türkiye Ulusal Envanteri’nin ülkeye özgü faktörleri, CH₄ ve N₂O için 2006 IPCC Kılavuzu varsayılan değerleri kullanılmıştır. Şebeke elektriğinde Enerji ve
          Tabii Kaynaklar Bakanlığı tüketim noktası faktörü, Kategori 3–4’te Türkiye’ye özgü veri bulunmayan kalemlerde DEFRA {DEFRA.yil} faktörleri kullanılmıştır.
          Küresel ısınma potansiyelleri IPCC {s.ayarlar.gwp} (100 yıl) değerleridir. Hesap Greentask karbon hesap motoru sürüm {s.motor} ile yapılmıştır.
        </p>
        <table className="mt-3 w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className={th}>Kalem</th>
              <th className={th}>Kat.</th>
              <th className={th}>Veri / kanıt</th>
              <th className={`${th} text-right`}>t CO₂e</th>
              <th className={`${th} text-right`}>±</th>
            </tr>
          </thead>
          <tbody>
            {s.satirlar.map((r) => {
              const f = kanit.get(r.kaynak_id);
              const ac = (f?.veri as { aciklama?: string } | undefined)?.aciklama;
              return (
                <tr key={r.id} className="break-inside-avoid">
                  <td className={td}>
                    <b>{r.tur === 'wtt' ? r.baslik : ac || r.baslik}</b>
                    {ac && r.tur !== 'wtt' && <span className="block text-[11px] text-soluk">{r.baslik}</span>}
                    <ol className="mt-1 list-decimal pl-4 font-mono text-[10.5px] leading-5 text-murekkep-2">
                      {r.izler.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ol>
                  </td>
                  <td className={td}>
                    {r.iso_kategori}
                    {r.ghgp_kategori ? ` / K3-${r.ghgp_kategori}` : ''}
                  </td>
                  <td className={`${td} text-[11px]`}>
                    {f ? VERI_KALITESI_ADI[f.veri.veri_kalitesi] : 'Türetilmiş'}
                    {f?.kanit && <span className="block text-soluk">{f.kanit}</span>}
                  </td>
                  <td className={`${td} ${sag}`}>{ton(r.co2e, 3)}</td>
                  <td className={`${td} text-right`}>{yuzde(r.belirsizlik, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Bolum>

      <Bolum no="5" baslik="Belirsizlik">
        <p>
          Belirsizlik IPCC 2006 Kılavuzu Cilt 1 Bölüm 3 Yaklaşım 1 (hata yayılımı) ile değerlendirilmiştir. Her kalemde faaliyet verisi ve emisyon faktörü
          belirsizlikleri karelerinin toplamının karekökü ile birleştirilmiş, kalemler arasında bağımsızlık varsayılarak toplam belirsizlik hesaplanmıştır. Faaliyet
          verisi belirsizliği veri kalitesine göre kabul edilmiştir:{' '}
          {Object.entries(VERI_BELIRSIZLIGI)
            .map(([k, u]) => `${VERI_KALITESI_ADI[k as keyof typeof VERI_BELIRSIZLIGI]} ${yuzde(u, 0)}`)
            .join(', ')}
          . Faktör belirsizlikleri IPCC varsayılan aralıklarından; kaynağında belirsizlik verilmeyen faktörlerde metodoloji kabulünden alınmıştır.
        </p>
      </Bolum>

      <Bolum no="6" baslik="Beyanlar">
        <p>Bu rapor TS EN ISO 14064-1:2018 standardına uygun olarak hazırlanmıştır.</p>
        <p className="mt-1">Bu envanter bağımsız üçüncü taraf doğrulamasından geçmemiştir.</p>
        {s.uyarilar.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-[12px]">
            {[...new Set(s.uyarilar)].map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        )}
      </Bolum>

      <Bolum no="7" baslik="Kaynaklar">
        <ol className="list-decimal pl-5 text-[12px]">
          {kaynaklar.map((k) => (
            <li key={k}>
              {KAYNAKLAR[k].ad}
              {KAYNAKLAR[k].url && <span className="block break-all text-soluk">{KAYNAKLAR[k].url}</span>}
              {KAYNAKLAR[k].not && <span className="block text-soluk">{KAYNAKLAR[k].not}</span>}
            </li>
          ))}
        </ol>
      </Bolum>
    </main>
  );
}

function Bolum({ no, baslik, children }: { no: string; baslik: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 border-b border-cizgi pb-1 text-base font-semibold">
        {no}. {baslik}
      </h2>
      {children}
    </section>
  );
}
