// Form verisini motorun faaliyet tipine çevirir; geçersiz girdiyi kullanıcıya okunur bir hata ile reddeder.
import type { FaaliyetVerisi, KarbonEnvanteri, KarbonFaaliyetSatiri } from '@/lib/veri/tipler';
import { defraFaktoru } from './defra';
import { SOGUTUCULAR } from './gwp';
import type { Ayarlar, Faaliyet, IsoKategori, VeriKalitesi } from './motor';
import { YAKITLAR, type AracTipi, type Sektor, type YakitBirimi, type YakitKodu } from './yakitlar';

export class FormHatasi extends Error {}

type Okuyucu = { get(ad: string): FormDataEntryValue | null };

const metin = (f: Okuyucu, ad: string) => String(f.get(ad) ?? '').trim();

function sayi(f: Okuyucu, ad: string, etiket: string, zorunlu = true): number | undefined {
  const v = metin(f, ad).replace(/\s/g, '').replace(',', '.');
  if (!v) {
    if (zorunlu) throw new FormHatasi(`${etiket} girilmeli`);
    return undefined;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new FormHatasi(`${etiket} geçerli bir sayı olmalı`);
  return n;
}

function secim<T extends string>(f: Okuyucu, ad: string, izinli: readonly T[], etiket: string): T {
  const v = metin(f, ad) as T;
  if (!izinli.includes(v)) throw new FormHatasi(`${etiket} seçilmeli`);
  return v;
}

const KALITE: VeriKalitesi[] = ['olcum', 'fatura', 'hesap', 'tahmin'];
const KATEGORI: IsoKategori[] = ['1', '2', '3', '4', '5', '6'];

export function formdanFaaliyet(f: Okuyucu): { veri: FaaliyetVerisi; kanit: string | null } {
  const ortak = {
    aciklama: metin(f, 'aciklama') || undefined,
    tesis: metin(f, 'tesis_birimi') || undefined,
    veri_kalitesi: secim(f, 'veri_kalitesi', KALITE, 'Veri kalitesi'),
  };
  const kanit = metin(f, 'kanit') || null;
  const tur = metin(f, 'tur');
  let veri: FaaliyetVerisi;
  switch (tur) {
    case 'sabit_yanma':
    case 'mobil_yanma': {
      const yakit = secim(f, 'yakit', Object.keys(YAKITLAR) as YakitKodu[], 'Yakıt');
      const birim = secim(f, 'birim', YAKITLAR[yakit].birimler, `${YAKITLAR[yakit].ad} için birim`) as YakitBirimi;
      const yakitAlanlari = {
        yakit,
        miktar: sayi(f, 'miktar', 'Miktar')!,
        birim,
        aid: sayi(f, 'aid', 'Alt ısıl değer', false),
        ust_isil_deger: birim === 'Sm3' ? sayi(f, 'ust_isil_deger', 'Faturadaki üst ısıl değer (kcal/Sm³)') : undefined,
      };
      veri =
        tur === 'sabit_yanma'
          ? { ...ortak, tur, ...yakitAlanlari, sektor: secim<Sektor>(f, 'sektor', ['sanayi', 'ticari'], 'Kullanım yeri') }
          : {
              ...ortak,
              tur,
              ...yakitAlanlari,
              arac: yakit === 'benzin' ? secim<AracTipi>(f, 'arac', ['benzin_1995_sonrasi', 'benzin_katalitik', 'benzin_katalizorsuz'], 'Taşıt tipi') : undefined,
            };
      if (tur === 'mobil_yanma' && !YAKITLAR[yakit].mobil) throw new FormHatasi(`${YAKITLAR[yakit].ad} taşıt yakıtı olarak seçilemez`);
      break;
    }
    case 'kacak':
      veri = { ...ortak, tur, gaz: secim(f, 'gaz', Object.keys(SOGUTUCULAR), 'Gaz'), miktar_kg: sayi(f, 'miktar_kg', 'Kaçak / dolum miktarı')! };
      break;
    case 'elektrik': {
      const carpan = metin(f, 'elektrik_birimi') === 'kWh' ? 0.001 : 1;
      const miktar = sayi(f, 'miktar', 'Tüketim')! * carpan;
      const yekg = (sayi(f, 'yekg', 'YEK-G miktarı', false) ?? 0) * carpan;
      if (yekg > miktar) throw new FormHatasi('YEK-G ile belgelenen miktar tüketimden büyük olamaz');
      veri = { ...ortak, tur, miktar_mwh: miktar, baglanti: secim(f, 'baglanti', ['dagitim', 'iletim'] as const, 'Bağlantı'), yekg_mwh: yekg || undefined };
      break;
    }
    case 'defra': {
      const id = metin(f, 'faktor_id');
      if (!defraFaktoru(id)) throw new FormHatasi('Listeden bir emisyon faktörü seçilmeli');
      veri = { ...ortak, tur, faktor_id: id, miktar: sayi(f, 'miktar', 'Miktar')! };
      break;
    }
    case 'ozel': {
      const kat = secim(f, 'iso_kategori', KATEGORI, 'ISO 14064-1 kategorisi');
      const ghgp = sayi(f, 'ghgp_kategori', 'GHG Protocol kategorisi', false);
      const kaynak = metin(f, 'faktor_kaynagi');
      if (!kaynak) throw new FormHatasi('Faktörün kaynağı yazılmalı (EPD, tedarikçi beyanı, ölçüm raporu…)');
      const birim = metin(f, 'ozel_birim');
      if (!birim) throw new FormHatasi('Birim yazılmalı');
      const u = sayi(f, 'faktor_belirsizlik', 'Faktör belirsizliği', false);
      veri = {
        ...ortak,
        tur,
        iso_kategori: kat,
        ghgp_kategori: ghgp && ghgp >= 1 && ghgp <= 15 ? Math.round(ghgp) : undefined,
        miktar: sayi(f, 'miktar', 'Miktar')!,
        birim,
        faktor: sayi(f, 'faktor', 'Emisyon faktörü')!,
        faktor_kaynagi: kaynak,
        faktor_belirsizlik: u == null ? undefined : u / 100,
        biyojenik: sayi(f, 'biyojenik', 'Biyojenik CO₂', false),
      };
      break;
    }
    default:
      throw new FormHatasi('Faaliyet türü seçilmeli');
  }
  // Tanımsız alanları atarak JSON'u sade tut
  return { veri: JSON.parse(JSON.stringify(veri)) as FaaliyetVerisi, kanit };
}

/** Veritabanı satırını motor girdisine çevirir. */
export const satirdanFaaliyet = (s: KarbonFaaliyetSatiri): Faaliyet => ({ ...s.veri, id: s.id }) as Faaliyet;

export const ayarlariAl = (e: KarbonEnvanteri): Ayarlar => ({ yil: e.yil, gwp: e.gwp, yakit_wtt: e.yakit_wtt });
