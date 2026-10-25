// İşletme planı yapı çıkarımı (plan haritası) ve biçim / tutarlılık taraması.
import { aciklamaCoz, type Belge, type Paragraf } from './docx';

// ---------------------------------------------------------------------------
// Plan haritası
// ---------------------------------------------------------------------------

export type PlanOgesi = {
  anahtar: string; // numaradan bağımsız sabit kimlik
  tur: 'bolum' | 'tablo' | 'sekil';
  icerik_turu: 'metin' | 'veri_tablosu' | 'dis_belge' | 'mevzuat_eki';
  numara: string | null;
  ad: string;
  bolum: string | null;
  veri_kaynagi: string | null;
  sira: number;
};

const kucuk = (s: string) => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLocaleLowerCase('tr');
export const normal = (s: string) =>
  kucuk(s)
    .replace(/\(\d{4}\)/g, '')
    .replace(/[^a-zçğıöşü0-9]+/g, ' ')
    .trim();

const NUMARA = /^((?:\d+|[A-ZÇĞİÖŞÜ])(?:\.(?:\d+|[A-ZÇĞİÖŞÜ]))*)\.?\s*(.*)$/;
const DIZIN_BASLIGI = /^(tablo|şekil|sekil) dizini$|^içindekiler$|^kısaltmalar/;
const NUMARASIZ_BASLIK = /^(tablo|şekil|sekil) dizini$|^içindekiler$|^ekler$|^kısaltmalar/;

/** Tablo başlığından içerik türü ve (varsa) sistemdeki izleme verisi. */
function tabloSinifi(ad: string): Pick<PlanOgesi, 'icerik_turu' | 'veri_kaynagi'> {
  const a = kucuk(ad);
  const veri = (k: string) => ({ icerik_turu: 'veri_tablosu' as const, veri_kaynagi: k });
  if (/depo gaz/.test(a)) return veri('depo_gazi');
  if (/sızıntı suyu oluşum|sızıntı suyu analiz/.test(a)) return veri('sizinti_suyu');
  if (/atıksu.*(çıkış|ölçüm)|deşarj/.test(a)) return veri('atiksu_numune');
  if (/gözlem kuyu|yeraltı suyu/.test(a)) return veri('gozlem_kuyusu');
  if (/kabul edil.*atık.*kod|atıkların tanım/.test(a)) return { icerik_turu: 'mevzuat_eki', veri_kaynagi: null };
  if (/yıllara göre|aylık|projeksiyon|karakterizasyon|miktar|ölçüm değer/.test(a)) return { icerik_turu: 'veri_tablosu', veri_kaynagi: null };
  return { icerik_turu: 'metin', veri_kaynagi: null };
}

export function planHaritasi(belge: Belge): PlanOgesi[] {
  const ogeler: PlanOgesi[] = [];
  const goruldu = new Map<string, number>();
  const anahtar = (tur: string, ad: string) => {
    const k = `${tur}:${normal(ad)}`;
    const n = (goruldu.get(k) ?? 0) + 1;
    goruldu.set(k, n);
    return n > 1 ? `${k}#${n}` : k;
  };
  let ana: string | null = null;
  let anaNo = 0;
  for (const p of belge.paragraflar) {
    if (p.tur === 'baslik' && p.seviye && p.seviye <= 2) {
      if (DIZIN_BASLIGI.test(kucuk(p.metin))) continue;
      // Şekil açıklamasının hemen ardından başlık stilinde tekrarlanan ad (ayrı bölüm değil)
      const onceki = ogeler.at(-1);
      if (onceki && onceki.tur !== 'bolum' && normal(onceki.ad) === normal(p.metin)) continue;
      const m = NUMARA.exec(p.metin);
      const elle = m && /[\d.]/.test(m[1]) && m[2] ? m[1] : null;
      if (p.seviye === 1) {
        anaNo++;
        ana = p.metin;
      }
      ogeler.push({
        anahtar: anahtar('bolum', elle ? m![2] : p.metin),
        tur: 'bolum',
        icerik_turu: 'metin',
        numara: elle ?? (p.seviye === 1 ? String(anaNo) : null),
        ad: elle ? m![2] : p.metin,
        bolum: p.seviye === 1 ? null : ana,
        veri_kaynagi: null,
        sira: ogeler.length,
      });
    } else if (p.tur === 'aciklama') {
      const a = aciklamaCoz(p.metin);
      if (!a) continue;
      const tur = a.tur === 'Tablo' ? 'tablo' : 'sekil';
      ogeler.push({
        anahtar: anahtar(tur, a.ad),
        tur,
        ...(tur === 'tablo' ? tabloSinifi(a.ad) : { icerik_turu: 'dis_belge' as const, veri_kaynagi: null }),
        numara: `${a.tur} ${a.no}`,
        ad: a.ad,
        bolum: ana,
        sira: ogeler.length,
      });
    }
  }
  return ogeler;
}

// ---------------------------------------------------------------------------
// Tarama
// ---------------------------------------------------------------------------

export type TaramaBulgusu = {
  kategori: 'dizin' | 'numara' | 'icerik' | 'tutarlilik' | 'yazim' | 'guncellik' | 'hesap';
  onem: 'yuksek' | 'orta' | 'dusuk';
  baslik: string;
  detay?: string;
  oneri?: string;
};

/** Sık görülen yazım hataları (yanlış → doğru). Gerektikçe genişletilir. */
export const YAZIM_SOZLUGU: [RegExp, string, string][] = [
  [/\bSızın Suyu/g, 'Sızın Suyu', 'Sızıntı Suyu'],
  [/\bİs Eğitim/g, 'İs Eğitim', 'İş Eğitim'],
  [/\bBoşatma/g, 'Boşatma', 'Boşaltma'],
  [/\bÖzelikleri/g, 'Özelikleri', 'Özellikleri'],
  [/\bSeperatör/gi, 'Seperatör', 'Separatör'],
  [/\bYönermelik/g, 'Yönermelik', 'Yönetmelik'],
  [/\bEkipmaları/g, 'Ekipmaları', 'Ekipmanları'],
  [/\bmüsade/g, 'müsade', 'müsaade'],
  [/\bherkez/g, 'herkez', 'herkes'],
  [/\bsarfiyet/g, 'sarfiyet', 'sarfiyat'],
];

const TR_HARF = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
const EN_HARF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Elle yazılmış numara parçasının sırası; harfler hem Türkçe hem Latin alfabesine göre denenir. */
function parcaSirasi(p: string): number[] {
  if (/^\d+$/.test(p)) return [Number(p)];
  return [TR_HARF.indexOf(p) + 1, EN_HARF.indexOf(p) + 1].filter((x) => x > 0);
}

function numaraKontrolu(paragraflar: Paragraf[]): TaramaBulgusu[] {
  const bulgular: TaramaBulgusu[] = [];
  const sayac: number[] = [];
  const uyumsuz: string[] = [];
  for (const p of paragraflar) {
    if (p.tur !== 'baslik' || !p.seviye) continue;
    if (p.seviye === 1 && NUMARASIZ_BASLIK.test(kucuk(p.metin))) continue;
    const L = p.seviye;
    sayac.length = L;
    sayac[L - 1] = (sayac[L - 1] ?? 0) + 1;
    for (let i = 0; i < L - 1; i++) sayac[i] ??= 1;
    const m = NUMARA.exec(p.metin);
    if (!m || !/[\d.]/.test(m[1]) || !m[2]) continue; // otomatik numaralı başlık
    const parcalar = m[1].split('.');
    if (parcalar.length !== L) continue; // düzey ile numara derinliği farklıysa yorum yapma
    const beklenen = sayac.slice(0, L);
    const uyar = parcalar.every((x, i) => parcaSirasi(x).includes(beklenen[i]));
    if (!uyar) {
      uyumsuz.push(`“${p.metin.slice(0, 60)}” — sırada ${beklenen.join('.')} bekleniyordu`);
      // elle yazılan numarayı esas al, sonraki kontroller ondan devam etsin
      parcalar.forEach((x, i) => (sayac[i] = parcaSirasi(x)[0] ?? sayac[i]));
    }
  }
  if (uyumsuz.length) {
    bulgular.push({
      kategori: 'numara',
      onem: 'orta',
      baslik: `${uyumsuz.length} başlıkta elle yazılmış numara sırayla uyuşmuyor`,
      detay: uyumsuz.slice(0, 8).join(' · '),
      oneri: 'Arada başlık stilinde olmayan bir bölüm olabilir ya da bir başlık silinmiş; numaraları ve başlık stillerini kontrol edin.',
    });
  }
  // Başlık gibi numaralanmış ama gövde stilinde kalan satırlar (içindekilerde görünmez)
  const stilsiz = paragraflar.filter(
    (p) => p.tur === 'govde' && p.metin.length < 90 && /^\d+(\.\d+)+\.?\s+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü –-]{3,}$/.test(p.metin),
  );
  const tekil = [...new Map(stilsiz.map((p) => [p.metin, p])).values()];
  if (tekil.length) {
    bulgular.push({
      kategori: 'numara',
      onem: 'orta',
      baslik: `${tekil.length} başlık, başlık stilinde değil (içindekilerde görünmüyor)`,
      detay: tekil.map((p) => `“${p.metin}”`).join(' · '),
      oneri: 'Bu satırlara uygun başlık stilini (Başlık 2/3) uygulayın, sonra içindekileri güncelleyin.',
    });
  }
  return bulgular;
}

/** İki başlığın benzerliği (harf ikilileri, 0–1). Dizindeki küçük yazım ve sayfa no farklarını tolere eder. */
export function benzerlik(a: string, b: string): number {
  if (a === b) return 1;
  const ikili = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const x = ikili(a.replace(/\s+/g, ''));
  const y = ikili(b.replace(/\s+/g, ''));
  let ortak = 0;
  for (const [k, n] of x) ortak += Math.min(n, y.get(k) ?? 0);
  const toplam = [...x.values()].reduce((t, n) => t + n, 0) + [...y.values()].reduce((t, n) => t + n, 0);
  return toplam ? (2 * ortak) / toplam : 0;
}
const ayni = (a?: string, b?: string) => !!a && !!b && benzerlik(a, b) >= 0.88;

function dizinKontrolu(paragraflar: Paragraf[]): TaramaBulgusu[] {
  const bulgular: TaramaBulgusu[] = [];
  for (const tur of ['Şekil', 'Tablo'] as const) {
    const dizin = new Map<number, string>();
    for (const p of paragraflar.filter((x) => x.tur === 'dizin_sekil')) {
      const a = aciklamaCoz(p.metin, true);
      if (a?.tur === tur) dizin.set(a.no, normal(a.ad));
    }
    const aciklama = new Map<number, string>();
    for (const p of paragraflar.filter((x) => x.tur === 'aciklama')) {
      const a = aciklamaCoz(p.metin);
      if (a?.tur === tur && !aciklama.has(a.no)) aciklama.set(a.no, normal(a.ad));
    }
    if (!dizin.size) continue;
    const farkli = [...aciklama.keys()].filter((n) => dizin.has(n) && !ayni(dizin.get(n), aciklama.get(n)));
    const dizindeYok = [...aciklama.keys()].filter((n) => !dizin.has(n));
    const sadeceDizinde = [...dizin.keys()].filter((n) => !aciklama.has(n));
    // Kayma: dizindeki n numaralı başlık, metinde n+1 numarada
    const kayma = farkli.filter((n) => ayni(dizin.get(n), aciklama.get(n + 1)));
    if (farkli.length || dizindeYok.length || sadeceDizinde.length) {
      const detay = [
        kayma.length
          ? `${tur} ${Math.min(...kayma)}’den itibaren metindeki numaralar dizine göre bir ilerde: araya yeni ${kucuk(tur)} eklenmiş, dizin yenilenmemiş`
          : null,
        farkli.length ? `Başlığı farklı: ${farkli.map((n) => `${tur} ${n}`).join(', ')}` : null,
        dizindeYok.length ? `Dizinde yok: ${dizindeYok.map((n) => `${tur} ${n}`).join(', ')}` : null,
        sadeceDizinde.length ? `Yalnızca dizinde: ${sadeceDizinde.map((n) => `${tur} ${n}`).join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      bulgular.push({
        kategori: 'dizin',
        onem: kayma.length || farkli.length > 3 ? 'yuksek' : 'orta',
        baslik: `${tur} dizini metinle uyuşmuyor (${farkli.length + dizindeYok.length + sadeceDizinde.length} kayıt)`,
        detay,
        oneri: 'Word’de dizine sağ tıklayıp “Alanı güncelleştir → Tüm tabloyu güncelleştir” deyin.',
      });
    }
  }
  const bozuk = paragraflar.filter((p) => p.tur === 'aciklama' && aciklamaCoz(p.metin)?.bozuk);
  if (bozuk.length) {
    bulgular.push({
      kategori: 'dizin',
      onem: 'orta',
      baslik: `${bozuk.length} açıklama bozuk yazılmış`,
      detay: bozuk.map((p) => `“${p.metin.slice(0, 60)}”`).join(' · '),
      oneri: 'Numara ile başlık arasına nokta ve boşluk ekleyin; başlığın doğru olduğunu kontrol edin.',
    });
  }
  return bulgular;
}

function mukerrerKontrolu(paragraflar: Paragraf[]): TaramaBulgusu[] {
  const gruplar = new Map<string, string[]>();
  for (const p of paragraflar.filter((x) => x.tur === 'aciklama')) {
    const a = aciklamaCoz(p.metin);
    if (!a) continue;
    const k = `${a.tur}|${normal(a.ad)}`;
    gruplar.set(k, [...(gruplar.get(k) ?? []), `${a.tur} ${a.no}`]);
  }
  return [...gruplar.entries()]
    .filter(([, v]) => new Set(v).size > 1)
    .map(([k, v]) => ({
      kategori: 'icerik' as const,
      onem: 'orta' as const,
      baslik: `${[...new Set(v)].join(' ve ')} aynı başlıkta`,
      detay: `“${k.split('|')[1]}”`,
      oneri: 'Mükerrer tablo/şekil olabilir; içeriklerini karşılaştırın, gerekirse birini kaldırın ya da başlığı ayırt edici yapın.',
    }));
}

function yazimKontrolu(metin: string): TaramaBulgusu[] {
  const bulunan = YAZIM_SOZLUGU.map(([re, y, d]) => ({ y, d, n: (metin.match(re) ?? []).length })).filter((x) => x.n);
  if (!bulunan.length) return [];
  return [
    {
      kategori: 'yazim',
      onem: 'dusuk',
      baslik: `${bulunan.reduce((t, x) => t + x.n, 0)} yazım hatası`,
      detay: bulunan.map((x) => `“${x.y}” → “${x.d}” (${x.n})`).join(' · '),
      oneri: 'Word’de Bul ve Değiştir ile toplu düzeltin.',
    },
  ];
}

function unvanKontrolu(metin: string, unvanlar: string[]): TaramaBulgusu[] {
  const bulgular: TaramaBulgusu[] = [];
  for (const unvan of unvanlar) {
    const kok = unvan.split(/\s+/).slice(0, 2).join(' ');
    if (kok.length < 6) continue;
    const kacis = kok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const varyant = new Map<string, number>();
    for (const m of metin.matchAll(new RegExp(`${kacis}[^,;()\\n]{0,60}?(?:A\\.\\s?Ş|AŞ|Ltd|Şirketi|Şubesi)`, 'g'))) {
      const v = m[0].replace(/\s+/g, ' ');
      varyant.set(v, (varyant.get(v) ?? 0) + 1);
    }
    if (varyant.size > 2) {
      bulgular.push({
        kategori: 'tutarlilik',
        onem: 'orta',
        baslik: `Firma unvanı ${varyant.size} farklı biçimde yazılmış (“${kok} …”)`,
        detay: [...varyant.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([v, n]) => `“${v}” (${n})`)
          .join(' · '),
        oneri: `Resmi unvanı tek biçimde kullanın: “${unvan}”.`,
      });
    }
  }
  return bulgular;
}

function guncellikKontrolu(paragraflar: Paragraf[], yil: number): TaramaBulgusu[] {
  const eski = paragraflar
    .filter((p) => p.tur === 'aciklama' && /^Tablo/.test(p.metin))
    .map((p) => ({ p, yillar: [...p.metin.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1])) }))
    .filter((x) => x.yillar.length && Math.max(...x.yillar) <= yil - 2);
  if (!eski.length) return [];
  return [
    {
      kategori: 'guncellik',
      onem: 'orta',
      baslik: `${eski.length} tablo ${yil - 2} ve öncesine ait veri içeriyor`,
      detay: eski.map((x) => `“${x.p.metin.slice(0, 80)}”`).join(' · '),
      oneri: 'Revizyonda güncel dönem verileriyle yenileyin (izleme kayıtlarından sistem üretebilir).',
    },
  ];
}

const sayi = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));

function hesapKontrolu(paragraflar: Paragraf[]): TaramaBulgusu[] {
  const hatali: TaramaBulgusu[] = [];
  const dogru = new Set<string>();
  // Çarpan: önünde harf/rakam olmayan sayı (Nm3/h'deki 3 sayılmaz), ardından en çok 14 karakterlik birim
  // Birim içinde harfe bitişik rakam olabilir (Nm3/h, m3/gün)
  const birim = String.raw`(?:[^\dx×=\n]|(?<=\p{L})\d){0,14}?`;
  const re = new RegExp(
    String.raw`((?:(?<![\p{L}\d.,])\d[\d.,]*\s*${birim}\s*[x×]\s*){1,3}\d[\d.,]*)\s*${birim}\s*=\s*(\d[\d.,]*)`,
    'gu',
  );
  for (const p of paragraflar) {
    for (const m of p.metin.matchAll(re)) {
      const carpanlar = m[1].split(/[x×]/).map((x) => sayi(/\d[\d.,]*/.exec(x)?.[0] ?? 'NaN'));
      const sonuc = sayi(m[2]);
      if (carpanlar.some(isNaN) || isNaN(sonuc) || carpanlar.length < 2) continue;
      const hesap = carpanlar.reduce((a, b) => a * b, 1);
      if (Math.abs(hesap - sonuc) <= Math.max(1, Math.abs(sonuc) * 0.005)) {
        dogru.add(m[0].trim());
      } else {
        hatali.push({
          kategori: 'hesap',
          onem: 'yuksek',
          baslik: 'Hesap sonucu tutmuyor',
          detay: `“${p.metin.slice(0, 160)}” — hesaplanan ${hesap.toLocaleString('tr-TR')}`,
          oneri: 'Çarpanları, birimleri ve sonucu kontrol edin; bu değeri kullanan diğer satırları da gözden geçirin.',
        });
      }
    }
  }
  if (dogru.size) {
    hatali.push({
      kategori: 'hesap',
      onem: 'dusuk',
      baslik: `${dogru.size} hesap doğrulandı`,
      detay: [...dogru].map((x) => `“${x}”`).join(' · '),
    });
  }
  return hatali;
}

export function planiTara(belge: Belge, secenek: { unvanlar: string[]; yil: number }): TaramaBulgusu[] {
  const metin = belge.paragraflar.map((p) => p.metin).join('\n');
  const sira: Record<TaramaBulgusu['onem'], number> = { yuksek: 0, orta: 1, dusuk: 2 };
  return [
    ...dizinKontrolu(belge.paragraflar),
    ...numaraKontrolu(belge.paragraflar),
    ...mukerrerKontrolu(belge.paragraflar),
    ...unvanKontrolu(metin, secenek.unvanlar),
    ...guncellikKontrolu(belge.paragraflar, secenek.yil),
    ...yazimKontrolu(metin),
    ...hesapKontrolu(belge.paragraflar),
  ].sort((a, b) => sira[a.onem] - sira[b.onem]);
}
