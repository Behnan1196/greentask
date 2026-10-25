import { existsSync, readFileSync } from 'node:fs';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { aciklamaCoz, docxOku } from './docx';
import { benzerlik, planHaritasi, planiTara } from './tarama';

// Küçük, elle kurulmuş bir .docx: [stil kimliği, metin]
function docx(paragraflar: [string, string][]): Uint8Array {
  const stiller = `<?xml version="1.0"?><w:styles xmlns:w="w">
    <w:style w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
    <w:style w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
    <w:style w:styleId="Heading3"><w:name w:val="heading 3"/></w:style>
    <w:style w:styleId="Caption"><w:name w:val="caption"/></w:style>
    <w:style w:styleId="TOF"><w:name w:val="table of figures"/></w:style>
  </w:styles>`;
  const kac = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const govde = paragraflar
    .map(([st, t]) => `<w:p>${st ? `<w:pPr><w:pStyle w:val="${st}"/></w:pPr>` : ''}<w:r><w:t>${kac(t)}</w:t></w:r></w:p>`)
    .join('');
  return zipSync({
    'word/document.xml': strToU8(`<?xml version="1.0"?><w:document xmlns:w="w"><w:body>${govde}</w:body></w:document>`),
    'word/styles.xml': strToU8(stiller),
  });
}

const ornek = docx([
  ['TOF', 'Şekil 1. Tesis Yerleşimi 4'],
  ['TOF', 'Şekil 2. Biyogaz Hattı 5'],
  ['TOF', 'Şekil 3. Sızıntı Suyu Havuzu 6'],
  ['Heading1', 'Tesis Bilgileri'],
  ['Heading2', 'Genel'],
  ['Caption', 'Şekil 1. Tesis Yerleşimi'],
  ['Caption', 'Şekil 2. Yeni Kantar'],
  ['Caption', 'Şekil 3. Biyogaz Hattı'],
  ['Caption', 'Şekil 4. Sızıntı Suyu Havuzu'],
  ['Caption', 'Tablo 1. Yıllara Göre Depo Gazı Miktarı (2019)'],
  ['Caption', 'Tablo 2. Kabul Edilen Atık Kodları'],
  ['Caption', 'Tablo 3. Kabul Edilen Atık Kodları'],
  ['Caption', 'Şekil 5Alıcı Ortam'],
  ['Heading1', 'Enerji'],
  ['Heading2', '2.1 Üretim'],
  ['Heading2', '2.3 Satış'],
  ['', '2.4 Bakım ve Onarım'],
  ['', 'Elektrik: 4.800 kWh x 24 saat/gün x 340 gün/yıl = 33.000.000 kWh/yıl'],
  ['', 'Biyogaz: 425 Nm3/h x 24 saat x 340 gün = 3.468.000 m3/yıl'],
  ['', 'Sızın Suyu toplanır. Samsun Avdan Enerji A.Ş, Samsun Avdan Enerji AŞ ve Samsun Avdan Enerji Ltd'],
]);

describe('docx ayrıştırma', () => {
  it('stil adından paragraf türünü çıkarır', () => {
    const b = docxOku(ornek);
    const tur = (m: string) => b.paragraflar.find((p) => p.metin === m)?.tur;
    expect(tur('Tesis Bilgileri')).toBe('baslik');
    expect(tur('Şekil 1. Tesis Yerleşimi 4')).toBe('dizin_sekil');
    expect(tur('Şekil 2. Yeni Kantar')).toBe('aciklama');
    expect(tur('2.4 Bakım ve Onarım')).toBe('govde');
  });
  it('açıklamayı çözer, sayfa numarasını ve bozuk yazımı tanır', () => {
    expect(aciklamaCoz('Şekil 21. Konveyör Bant Sistemi 24', true)).toMatchObject({ no: 21, ad: 'Konveyör Bant Sistemi', bozuk: false });
    expect(aciklamaCoz('Şekil 40Alıcı Ortam')).toMatchObject({ no: 40, bozuk: true });
    expect(aciklamaCoz('Genel bilgiler')).toBeNull();
  });
  it('docx olmayan dosyayı reddeder', () => {
    expect(() => docxOku(zipSync({ 'a.txt': strToU8('x') }))).toThrow(/Word/);
  });
});

describe('plan haritası', () => {
  const h = planHaritasi(docxOku(ornek));
  it('bölüm, tablo ve şekilleri çıkarır', () => {
    expect(h.filter((o) => o.tur === 'bolum').map((o) => o.numara)).toEqual(['1', null, '2', '2.1', '2.3']);
    expect(h.filter((o) => o.tur === 'sekil')).toHaveLength(5);
  });
  it('tabloları sınıflandırır ve numaradan bağımsız anahtar üretir', () => {
    const t1 = h.find((o) => o.numara === 'Tablo 1')!;
    expect(t1).toMatchObject({ icerik_turu: 'veri_tablosu', veri_kaynagi: 'depo_gazi', anahtar: 'tablo:yıllara göre depo gazı miktarı' });
    expect(h.find((o) => o.numara === 'Tablo 2')?.icerik_turu).toBe('mevzuat_eki');
    expect(h.find((o) => o.numara === 'Tablo 3')?.anahtar).toBe('tablo:kabul edilen atık kodları#2');
  });
});

describe('tarama', () => {
  const bulgular = planiTara(docxOku(ornek), { unvanlar: ['Samsun Avdan Enerji A.Ş.'], yil: 2026 });
  const bul = (k: string, re: RegExp) => bulgular.find((b) => b.kategori === k && re.test(`${b.baslik} ${b.detay ?? ''}`));

  it('dizin kaymasını ve dizinde olmayan şekli bulur', () => {
    const d = bul('dizin', /Şekil dizini/)!;
    expect(d.onem).toBe('yuksek');
    expect(d.detay).toMatch(/Şekil 2’den itibaren/);
    expect(d.detay).toMatch(/Dizinde yok: Şekil 4, Şekil 5/);
  });
  it('bozuk açıklamayı bulur', () => expect(bul('dizin', /Alıcı Ortam/)).toBeTruthy());
  it('numara atlamasını ve başlık stilinde olmayan başlığı bulur', () => {
    expect(bul('numara', /2\.3 Satış.*2\.2 bekleniyordu/)).toBeTruthy();
    expect(bul('numara', /başlık stilinde değil.*2\.4 Bakım/)).toBeTruthy();
  });
  it('mükerrer başlık, unvan, güncellik ve yazım', () => {
    expect(bul('icerik', /Tablo 2 ve Tablo 3/)).toBeTruthy();
    expect(bul('tutarlilik', /3 farklı biçimde/)).toBeTruthy();
    expect(bul('guncellik', /Tablo 1/)).toBeTruthy();
    expect(bul('yazim', /Sızıntı Suyu/)).toBeTruthy();
  });
  it('hatalı hesabı yakalar, birimde rakam olan doğru hesabı doğrular', () => {
    expect(bul('hesap', /tutmuyor.*39\.168\.000/)?.onem).toBe('yuksek');
    expect(bul('hesap', /1 hesap doğrulandı.*425 Nm3\/h/)).toBeTruthy();
  });
  it('önem sırasına dizer', () => {
    const o = { yuksek: 0, orta: 1, dusuk: 2 };
    expect(bulgular.map((b) => o[b.onem])).toEqual([...bulgular.map((b) => o[b.onem])].sort());
  });
  it('benzerlik küçük farkları tolere eder', () => {
    expect(benzerlik('su boşatma vanası', 'su boşaltma vanası')).toBeGreaterThan(0.88);
    expect(benzerlik('yeni kantar', 'biyogaz hattı')).toBeLessThan(0.5);
  });
});

// Gerçek plan (depoda yok; müşteri belgesi). Dosya varsa çalışır.
const GERCEK = process.env.GT_PLAN_ORNEGI ?? '/home/claude/data/plan/ozturk_2024.docx';
describe.skipIf(!existsSync(GERCEK))('gerçek işletme planı', () => {
  const belge = docxOku(new Uint8Array(readFileSync(GERCEK)));
  const bulgular = planiTara(belge, { unvanlar: ['Samsun Avdan Enerji A.Ş.'], yil: 2026 });
  it('haritayı çıkarır', () => expect(planHaritasi(belge).length).toBeGreaterThan(80));
  it('bilinen hataları bulur', () => {
    const t = bulgular.map((b) => `${b.baslik} ${b.detay}`).join('\n');
    expect(t).toMatch(/Şekil 21’den itibaren/);
    expect(t).toMatch(/33\.000\.000.*hesaplanan 39\.168\.000/);
    expect(t).toMatch(/Şekil 40Alıcı/);
    expect(bulgular.filter((b) => /tutmuyor/.test(b.baslik))).toHaveLength(1);
  });
});
