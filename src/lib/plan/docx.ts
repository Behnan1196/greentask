// Word (.docx) işletme planı ayrıştırıcısı: başlıklar, tablo/şekil açıklamaları ve dizinler.
// Bağımlılık yalnızca zip açıcı (fflate); XML düz metin olarak taranır (plan belgeleri için yeterli ve hızlı).
import { strFromU8, unzipSync } from 'fflate';

export type ParagrafTuru = 'baslik' | 'aciklama' | 'dizin_sekil' | 'icindekiler' | 'govde';

export type Paragraf = {
  sira: number;
  stil: string; // stil adı (styles.xml'den), yoksa kimliği
  seviye: number | null; // başlık seviyesi
  tur: ParagrafTuru;
  metin: string;
};

export type Belge = {
  paragraflar: Paragraf[];
  tabloSayisi: number;
  gorselSayisi: number;
};

const XML_VARLIK: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
const coz = (s: string) => s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => XML_VARLIK[m]);

type StilBilgisi = { ad: string; seviye: number | null };

function stilleriOku(xml: string): Map<string, StilBilgisi> {
  const harita = new Map<string, StilBilgisi>();
  for (const m of xml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const ad = /<w:name w:val="([^"]+)"/.exec(m[2])?.[1] ?? m[1];
    const outline = /<w:outlineLvl w:val="(\d)"/.exec(m[2])?.[1];
    const baslik = /^heading (\d)$/i.exec(ad)?.[1];
    harita.set(m[1], { ad, seviye: baslik ? Number(baslik) : outline != null ? Number(outline) + 1 : null });
  }
  return harita;
}

function turBelirle(stil: StilBilgisi | undefined, stilId: string, metin: string): { tur: ParagrafTuru; seviye: number | null } {
  const ad = (stil?.ad ?? stilId).toLowerCase();
  if (ad === 'table of figures') return { tur: 'dizin_sekil', seviye: null };
  if (/^toc \d$/.test(ad)) return { tur: 'icindekiler', seviye: null };
  if (ad === 'caption') return { tur: 'aciklama', seviye: null };
  if (stil?.seviye) return { tur: 'baslik', seviye: stil.seviye };
  // Açıklama stili kullanılmadan yazılmış "Tablo 12. …" satırları
  if (/^(Tablo|Şekil)\s?\d+\b/.test(metin) && metin.length < 200) return { tur: 'aciklama', seviye: null };
  return { tur: 'govde', seviye: null };
}

export function docxOku(veri: Uint8Array): Belge {
  const dosyalar = unzipSync(veri, {
    filter: (f) => f.name === 'word/document.xml' || f.name === 'word/styles.xml' || f.name.startsWith('word/media/'),
  });
  const belge = dosyalar['word/document.xml'];
  if (!belge) throw new Error('Geçerli bir Word (.docx) dosyası değil');
  const xml = strFromU8(belge);
  const stiller = dosyalar['word/styles.xml'] ? stilleriOku(strFromU8(dosyalar['word/styles.xml'])) : new Map();

  const paragraflar: Paragraf[] = [];
  let sira = 0;
  for (const m of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const p = m[0];
    const stilId = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? '';
    const metin = coz(
      p
        .replace(/<w:tab\/>/g, ' ')
        .match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>/g)
        ?.map((t) => t.replace(/<[^>]+>/g, ''))
        .join('') ?? '',
    )
      .replace(/\s+/g, ' ')
      .trim();
    if (!metin) continue;
    const st = stiller.get(stilId);
    const { tur, seviye } = turBelirle(st, stilId, metin);
    paragraflar.push({ sira: sira++, stil: st?.ad ?? stilId, seviye, tur, metin });
  }
  return {
    paragraflar,
    tabloSayisi: (xml.match(/<w:tbl>/g) ?? []).length,
    gorselSayisi: Object.keys(dosyalar).filter((f) => f.startsWith('word/media/')).length,
  };
}

/** "Şekil 21. Konveyör Bant Sistemi 24" → { tur: 'Şekil', no: 21, ad: 'Konveyör Bant Sistemi' } */
export function aciklamaCoz(metin: string, dizinden = false): { tur: 'Tablo' | 'Şekil'; no: number; ad: string; bozuk: boolean } | null {
  const m = /^(Tablo|Şekil)\s?(\d+)(\.?)\s*(.*)$/.exec(metin);
  if (!m) return null;
  let ad = m[4].trim();
  if (dizinden) ad = ad.replace(/[\s.]*\d+$/, '').trim(); // sayfa numarası
  const bozuk = /^(Tablo|Şekil)\s?\d+[A-Za-zÇĞİÖŞÜçğıöşü]/.test(metin); // "Şekil 40Alıcı Ortam"
  return { tur: m[1] as 'Tablo' | 'Şekil', no: Number(m[2]), ad, bozuk };
}
