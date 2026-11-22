'use client';

import { useMemo, useState } from 'react';
import { SOGUTUCULAR } from '@/lib/karbon/gwp';
import { GHGP_KATEGORI_ADI, ISO_KATEGORI_ADI } from '@/lib/karbon/adlar';
import type { Faaliyet } from '@/lib/karbon/motor';
import { VERI_KALITESI_ADI } from '@/lib/karbon/sunum';
import { YAKITLAR, type YakitKodu } from '@/lib/karbon/yakitlar';
import type { FaaliyetVerisi } from '@/lib/veri/tipler';

const GIRDI = 'min-h-10 w-full rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal';
const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';
const ETIKET = 'flex flex-col gap-1 text-sm';

export type DefraSecenegi = { id: string; grup: string; ad: string; birim: string; deger: number };

const BIRIM_ADI: Record<string, string> = { Sm3: 'Sm³', kWh: 'kWh (fatura)', MWh: 'MWh', GJ: 'GJ', litre: 'litre', kg: 'kg', ton: 'ton' };

type Props = {
  eylem: (f: FormData) => Promise<void>;
  envanterId: string;
  tur: Faaliyet['tur'];
  faaliyetId?: string;
  d?: FaaliyetVerisi;
  kanit?: string | null;
  defra?: { gruplar: [string, string][]; secenekler: DefraSecenegi[] };
};

export function FaaliyetFormu({ eylem, envanterId, tur, faaliyetId, d, kanit, defra }: Props) {
  const v = (d ?? {}) as Record<string, unknown>;
  const [yakit, setYakit] = useState<YakitKodu>((v.yakit as YakitKodu) ?? (tur === 'mobil_yanma' ? 'motorin' : 'dogalgaz'));
  const [birim, setBirim] = useState<string>((v.birim as string) ?? YAKITLAR[yakit].birimler[0]);
  const yakitlar = (Object.values(YAKITLAR) as (typeof YAKITLAR)[YakitKodu][]).filter((y) => tur !== 'mobil_yanma' || y.mobil);
  const birimler = YAKITLAR[yakit].birimler;

  const yakitDegisti = (k: YakitKodu) => {
    setYakit(k);
    if (!YAKITLAR[k].birimler.includes(birim as never)) setBirim(YAKITLAR[k].birimler[0]);
  };

  return (
    <form action={eylem} className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
      <input type="hidden" name="id" value={envanterId} />
      <input type="hidden" name="tur" value={tur} />
      {faaliyetId && <input type="hidden" name="faaliyet_id" value={faaliyetId} />}

      <label className={`${ETIKET} col-span-full`}>
        Açıklama
        <input name="aciklama" defaultValue={(v.aciklama as string) ?? ''} placeholder={ORNEK[tur]} className={GIRDI} />
      </label>

      {(tur === 'sabit_yanma' || tur === 'mobil_yanma') && (
        <>
          <label className={ETIKET}>
            Yakıt
            <select name="yakit" value={yakit} onChange={(e) => yakitDegisti(e.target.value as YakitKodu)} className={GIRDI}>
              {yakitlar.map((y) => (
                <option key={y.kod} value={y.kod}>
                  {y.ad}
                </option>
              ))}
            </select>
          </label>
          <label className={ETIKET}>
            Miktar
            <input name="miktar" inputMode="decimal" required defaultValue={num(v.miktar)} className={GIRDI} />
          </label>
          <label className={ETIKET}>
            Birim
            <select name="birim" value={birim} onChange={(e) => setBirim(e.target.value)} className={GIRDI}>
              {birimler.map((b) => (
                <option key={b} value={b}>
                  {BIRIM_ADI[b]}
                </option>
              ))}
            </select>
          </label>
          {birim === 'Sm3' && (
            <label className={ETIKET}>
              Faturadaki üst ısıl değer (kcal/Sm³)
              <input name="ust_isil_deger" inputMode="decimal" required defaultValue={num(v.ust_isil_deger)} placeholder="ör. 9155" className={GIRDI} />
            </label>
          )}
          {yakit !== 'dogalgaz' && (
            <label className={ETIKET}>
              Alt ısıl değer, MJ/kg (varsa)
              <input name="aid" inputMode="decimal" defaultValue={num(v.aid)} placeholder={`boşsa IPCC: ${YAKITLAR[yakit].aid}`} className={GIRDI} />
            </label>
          )}
          {tur === 'sabit_yanma' && (
            <label className={ETIKET}>
              Kullanım yeri
              <select name="sektor" defaultValue={(v.sektor as string) ?? 'sanayi'} className={GIRDI}>
                <option value="sanayi">Üretim tesisi / sanayi</option>
                <option value="ticari">Ofis, bina ısıtması</option>
              </select>
            </label>
          )}
          {tur === 'mobil_yanma' && yakit === 'benzin' && (
            <label className={ETIKET}>
              Taşıt tipi
              <select name="arac" defaultValue={(v.arac as string) ?? 'benzin_1995_sonrasi'} className={GIRDI}>
                <option value="benzin_1995_sonrasi">Binek, 1995 ve sonrası</option>
                <option value="benzin_katalitik">Katalitik konvertörlü (eski)</option>
                <option value="benzin_katalizorsuz">Katalizörsüz</option>
              </select>
            </label>
          )}
        </>
      )}

      {tur === 'kacak' && (
        <>
          <label className={ETIKET}>
            Gaz
            <select name="gaz" defaultValue={(v.gaz as string) ?? 'R-410A'} className={GIRDI}>
              {Object.entries(SOGUTUCULAR).map(([k, ad]) => (
                <option key={k} value={k}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          <label className={ETIKET}>
            Yıl içinde eklenen gaz, kg
            <input name="miktar_kg" inputMode="decimal" required defaultValue={num(v.miktar_kg)} className={GIRDI} />
          </label>
        </>
      )}

      {tur === 'elektrik' && (
        <>
          <label className={ETIKET}>
            Yıllık tüketim
            <input name="miktar" inputMode="decimal" required defaultValue={num(v.miktar_mwh)} className={GIRDI} />
          </label>
          <label className={ETIKET}>
            Birim
            <select name="elektrik_birimi" defaultValue="MWh" className={GIRDI}>
              <option value="MWh">MWh</option>
              <option value="kWh">kWh</option>
            </select>
          </label>
          <label className={ETIKET}>
            Bağlantı
            <select name="baglanti" defaultValue={(v.baglanti as string) ?? 'dagitim'} className={GIRDI}>
              <option value="dagitim">Dağıtım hattı (OG / AG)</option>
              <option value="iletim">İletim hattı (154 kV ve üstü)</option>
            </select>
          </label>
          <label className={ETIKET}>
            YEK-G ile belgelenen (aynı birimde)
            <input name="yekg" inputMode="decimal" defaultValue={num(v.yekg_mwh)} placeholder="yoksa boş" className={GIRDI} />
          </label>
        </>
      )}

      {tur === 'defra' && defra && <DefraSecici defra={defra} secili={v.faktor_id as string | undefined} miktar={num(v.miktar)} />}

      {tur === 'ozel' && (
        <>
          <label className={ETIKET}>
            ISO 14064-1 kategorisi
            <select name="iso_kategori" defaultValue={(v.iso_kategori as string) ?? '4'} className={GIRDI}>
              {Object.entries(ISO_KATEGORI_ADI).map(([k, ad]) => (
                <option key={k} value={k}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          <label className={ETIKET}>
            GHG Protocol Kapsam 3 kategorisi
            <select name="ghgp_kategori" defaultValue={num(v.ghgp_kategori)} className={GIRDI}>
              <option value="">— (Kapsam 1-2 ise boş)</option>
              {Object.entries(GHGP_KATEGORI_ADI).map(([k, ad]) => (
                <option key={k} value={k}>
                  {k}. {ad}
                </option>
              ))}
            </select>
          </label>
          <label className={ETIKET}>
            Miktar
            <input name="miktar" inputMode="decimal" required defaultValue={num(v.miktar)} className={GIRDI} />
          </label>
          <label className={ETIKET}>
            Birim
            <input name="ozel_birim" required defaultValue={(v.birim as string) ?? ''} placeholder="ton, adet, m²…" className={GIRDI} />
          </label>
          <label className={ETIKET}>
            Faktör, kg CO₂e / birim
            <input name="faktor" inputMode="decimal" required defaultValue={num(v.faktor)} className={GIRDI} />
          </label>
          <label className={ETIKET}>
            Faktör belirsizliği, % (varsa)
            <input name="faktor_belirsizlik" inputMode="decimal" defaultValue={v.faktor_belirsizlik != null ? String(Number(v.faktor_belirsizlik) * 100) : ''} placeholder="boşsa %30" className={GIRDI} />
          </label>
          <label className={`${ETIKET} col-span-full`}>
            Faktörün kaynağı
            <input name="faktor_kaynagi" required defaultValue={(v.faktor_kaynagi as string) ?? ''} placeholder="ör. Tedarikçi EPD no. S-P-01234, 2025" className={GIRDI} />
          </label>
          <label className={ETIKET}>
            Biyojenik CO₂, kg / birim (varsa)
            <input name="biyojenik" inputMode="decimal" defaultValue={num(v.biyojenik)} className={GIRDI} />
          </label>
        </>
      )}

      <label className={ETIKET}>
        Veri kalitesi
        <select name="veri_kalitesi" defaultValue={(v.veri_kalitesi as string) ?? 'fatura'} className={GIRDI}>
          {Object.entries(VERI_KALITESI_ADI).map(([k, ad]) => (
            <option key={k} value={k}>
              {ad}
            </option>
          ))}
        </select>
      </label>
      <label className={ETIKET}>
        Bölüm / tesis (varsa)
        <input name="tesis_birimi" defaultValue={(v.tesis as string) ?? ''} className={GIRDI} />
      </label>
      <label className={`${ETIKET} col-span-full`}>
        Kanıt (fatura no, sayaç, belge)
        <input name="kanit" defaultValue={kanit ?? ''} placeholder="Doğrulamada istenecek belgenin adı" className={GIRDI} />
      </label>
      <button className={`${ANA} justify-self-start`}>{faaliyetId ? 'Kaydet' : 'Ekle'}</button>
    </form>
  );
}

function DefraSecici({ defra, secili, miktar }: { defra: NonNullable<Props['defra']>; secili?: string; miktar: string }) {
  const ilk = defra.secenekler.find((s) => s.id === secili);
  const [grup, setGrup] = useState(ilk?.grup ?? defra.gruplar[0][0]);
  const [ara, setAra] = useState('');
  const [id, setId] = useState(secili ?? '');
  const liste = useMemo(() => {
    const a = ara.toLocaleLowerCase('tr');
    return defra.secenekler.filter((s) => s.grup === grup && (!a || s.ad.toLocaleLowerCase('tr').includes(a)));
  }, [defra.secenekler, grup, ara]);
  const sec = defra.secenekler.find((s) => s.id === id);
  return (
    <>
      <label className={ETIKET}>
        Grup
        <select value={grup} onChange={(e) => setGrup(e.target.value)} className={GIRDI}>
          {defra.gruplar.map(([k, ad]) => (
            <option key={k} value={k}>
              {ad}
            </option>
          ))}
        </select>
      </label>
      <label className={ETIKET}>
        Süz (İngilizce adla)
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="ör. Turkey, HGV, Plastics" className={GIRDI} />
      </label>
      <label className={`${ETIKET} col-span-full`}>
        Emisyon faktörü · {liste.length} seçenek
        <select name="faktor_id" value={id} onChange={(e) => setId(e.target.value)} required className={GIRDI}>
          <option value="">— seçin —</option>
          {liste.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ad} · {s.deger.toLocaleString('tr-TR', { maximumFractionDigits: 5 })} kg CO₂e/{s.birim}
            </option>
          ))}
          {sec && !liste.includes(sec) && <option value={sec.id}>{sec.ad}</option>}
        </select>
      </label>
      <label className={ETIKET}>
        Miktar{sec ? ` (${sec.birim})` : ''}
        <input name="miktar" inputMode="decimal" required defaultValue={miktar} className={GIRDI} />
      </label>
    </>
  );
}

const num = (x: unknown) => (x == null ? '' : String(x));

const ORNEK: Record<Faaliyet['tur'], string> = {
  sabit_yanma: 'ör. Buhar kazanı doğal gaz tüketimi 2025',
  mobil_yanma: 'ör. Şirket araçları motorin (taşıt tanıma kartı)',
  kacak: 'ör. Ofis klimaları servis dolumu',
  elektrik: 'ör. Fabrika elektrik tüketimi (12 fatura)',
  defra: 'ör. Hammadde nakliyesi (tır, ton·km)',
  ozel: 'ör. Satın alınan çelik sac (tedarikçi EPD)',
};
