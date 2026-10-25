// Termin kural motoru.
// Girdi: yükümlülük türü (kural tipi + varsayılan parametreler), tesis bazlı kayıt ve olaylar.
// Çıktı: son tarih, aksiyon tarihi, kalan günler ve durum.
// Saf fonksiyon: veritabanına ve saate bağlı değil (bugün dışarıdan verilir), bu yüzden test edilebilir.

import { ayEkle, enBuyuk, gunEkle, gunFarki, trTarih, type Gun } from './tarih';
import { izlemePeriyodu, type AtiksuNiteligi } from './skky';

export type KuralTipi =
  | 'bitis_tarihi'
  | 'son_islem_periyot'
  | 'sozlesme_takvimi'
  | 'yenilenen_sozlesme'
  | 'donemsel_rapor'
  | 'yillik_sabit_tarih';

export type KayitDurumu = 'aktif' | 'muaf' | 'kapsam_disi' | 'beklemede';
export type OlayTuru = 'gerceklesti' | 'sunuldu' | 'eksiklik_geldi' | 'eksiklik_yanitlandi' | 'onaylandi' | 'not';

/** Bir aşama: son tarihten `gun` ya da `ay` önce. */
export type Asama = { ad: string; gun?: number; ay?: number };

export type Parametreler = {
  // bitis_tarihi
  asamalar?: Asama[];
  gecerlilik_ay?: number; // bitiş girilmemişse: belge_tarihi + gecerlilik_ay
  // son_islem_periyot
  periyot_ay?: number;
  periyot_gun?: number;
  hazirlik_ay?: number;
  hazirlik_gun?: number;
  atiksu_niteligi?: AtiksuNiteligi; // periyot SKKY tablosundan
  debi_veya_en?: number;
  // sozlesme_takvimi
  ilk_gun?: number; // ilk gerçekleşme: sözleşme + ilk_gun
  // yenilenen_sozlesme
  sure_yil?: number;
  yenileme?: boolean;
  yenileme_yil?: number;
  // donemsel_rapor
  sunum_gun?: number;
  // yillik_sabit_tarih
  ay?: number;
  gun_no?: number;
  // ortak
  aksiyon_adi?: string;
};

export type YukumlulukTuru = {
  kod: string;
  ad: string;
  kural_tipi: KuralTipi;
  parametreler: Parametreler;
};

export type Olay = { tarih: Gun; tur: OlayTuru; aciklama?: string | null };

export type TesisYukumlulugu = {
  durum: KayitDurumu;
  gecerlilik_bitis?: Gun | null;
  belge_tarihi?: Gun | null;
  son_islem?: Gun | null;
  baslangic?: Gun | null;
  parametreler?: Parametreler;
  olaylar?: Olay[];
};

export type TesisBaglami = { sozlesme_tarihi?: Gun | null };

export type TerminDurumu =
  | 'gecikti'
  | 'acil'
  | 'yaklasiyor'
  | 'planli'
  | 'surecte'
  | 'veri_eksik'
  | 'muaf'
  | 'kapsam_disi'
  | 'beklemede';

export type TerminSonucu = {
  durum: TerminDurumu;
  sonTarih: Gun | null;
  aksiyonTarihi: Gun | null;
  aksiyonAdi: string | null;
  kalanGunSon: number | null;
  kalanGunAksiyon: number | null;
  aciklama: string;
};

const OLAY_METNI: Record<OlayTuru, string> = {
  gerceklesti: 'gerçekleşti',
  sunuldu: 'sunuldu',
  eksiklik_geldi: 'eksiklik geldi',
  eksiklik_yanitlandi: 'eksikliğe dönüldü',
  onaylandi: 'onaylandı',
  not: 'not',
};

export const ESIK = { acil: 30, yaklasiyor: 90 } as const;

/** Kokpit sırası: önce gecikmiş, sonra en yakın. */
export const DURUM_ONCELIK: Record<TerminDurumu, number> = {
  gecikti: 0,
  acil: 1,
  yaklasiyor: 2,
  surecte: 3,
  veri_eksik: 4,
  planli: 5,
  beklemede: 6,
  muaf: 7,
  kapsam_disi: 8,
};

function zamanaGoreDurum(kalan: number): TerminDurumu {
  if (kalan < 0) return 'gecikti';
  if (kalan <= ESIK.acil) return 'acil';
  if (kalan <= ESIK.yaklasiyor) return 'yaklasiyor';
  return 'planli';
}

function asamaTarihi(son: Gun, a: Asama): Gun {
  return a.ay != null ? ayEkle(son, -a.ay) : gunEkle(son, -(a.gun ?? 0));
}

function sonuc(
  bugun: Gun,
  sonTarih: Gun,
  aksiyonTarihi: Gun,
  aksiyonAdi: string,
  aciklama: string,
): TerminSonucu {
  const kalanGunAksiyon = gunFarki(bugun, aksiyonTarihi);
  return {
    durum: zamanaGoreDurum(kalanGunAksiyon),
    sonTarih,
    aksiyonTarihi,
    aksiyonAdi,
    kalanGunSon: gunFarki(bugun, sonTarih),
    kalanGunAksiyon,
    aciklama,
  };
}

function eksik(aciklama: string): TerminSonucu {
  return {
    durum: 'veri_eksik',
    sonTarih: null,
    aksiyonTarihi: null,
    aksiyonAdi: null,
    kalanGunSon: null,
    kalanGunAksiyon: null,
    aciklama,
  };
}

function olaylar(k: TesisYukumlulugu, ...turler: OlayTuru[]): Gun[] {
  return [...new Set((k.olaylar ?? []).filter((o) => turler.includes(o.tur)).map((o) => o.tarih))].sort();
}

// ---------------------------------------------------------------------------

function bitisTarihi(p: Parametreler, k: TesisYukumlulugu, bugun: Gun): TerminSonucu {
  let bitis = k.gecerlilik_bitis ?? null;
  if (!bitis && k.belge_tarihi && p.gecerlilik_ay) bitis = ayEkle(k.belge_tarihi, p.gecerlilik_ay);
  if (!bitis) {
    // Belge henüz yok ama başvuru süreci yürüyorsa (örn. EAYP eksikliğe dönüldü) süreçte say.
    const son = olaylar(k, 'sunuldu', 'eksiklik_geldi', 'eksiklik_yanitlandi').filter((t) => t >= gunEkle(bugun, -365));
    if (son.length) return { ...eksik(`Süreçte · son işlem ${trTarih(son[son.length - 1])}`), durum: 'surecte' };
    return eksik('Geçerlilik bitiş tarihi girilmemiş');
  }

  const asamalar = (p.asamalar?.length ? p.asamalar : [{ ad: p.aksiyon_adi ?? 'Yenileme', gun: 0 }])
    .map((a) => ({ ad: a.ad, tarih: asamaTarihi(bitis!, a) }))
    .sort((x, y) => x.tarih.localeCompare(y.tarih));

  // Süreç başlamış mı? (ilk aşamadan en çok 6 ay önce ya da sonra sunuldu / yenilendi)
  const esik = gunEkle(asamalar[0].tarih, -180);
  const surec = olaylar(k, 'sunuldu', 'gerceklesti', 'eksiklik_geldi', 'eksiklik_yanitlandi', 'onaylandi').filter(
    (t) => t >= esik,
  );
  if (surec.length) {
    const r = sonuc(bugun, bitis, asamalar[asamalar.length - 1].tarih, asamalar[asamalar.length - 1].ad, '');
    const sonOlay = (k.olaylar ?? []).filter((o) => o.tarih === surec[surec.length - 1]).pop();
    const onay = olaylar(k, 'onaylandi').some((t) => t >= esik);
    return {
      ...r,
      durum: 'surecte',
      aciklama: onay
        ? 'Onaylandı — yeni geçerlilik tarihini girin'
        : `Süreçte · son işlem: ${OLAY_METNI[sonOlay?.tur ?? 'not']} (${trTarih(surec[surec.length - 1])})`,
    };
  }

  // Geçilmemiş ilk aşama; hepsi geçildiyse sonuncusu (gecikmiş olarak).
  const sira = asamalar.find((a) => a.tarih >= bugun) ?? asamalar[asamalar.length - 1];
  const plan = asamalar.length > 1 ? asamalar.map((a) => `${a.ad}: ${trTarih(a.tarih)}`).join(' · ') : '';
  return sonuc(bugun, bitis, sira.tarih, sira.ad, plan);
}

function periyotGun(p: Parametreler): { ay?: number; gun?: number; etiket?: string } | null {
  if (p.atiksu_niteligi && p.debi_veya_en != null) {
    const iz = izlemePeriyodu(p.atiksu_niteligi, p.debi_veya_en);
    return iz ? { gun: iz.aralikGun, etiket: iz.periyot } : null;
  }
  if (p.periyot_ay) return { ay: p.periyot_ay };
  if (p.periyot_gun) return { gun: p.periyot_gun };
  return null;
}

function sonIslemPeriyot(p: Parametreler, k: TesisYukumlulugu, bugun: Gun): TerminSonucu {
  const son = enBuyuk(k.son_islem, ...olaylar(k, 'gerceklesti'));
  if (!son) return eksik('Son işlem (ölçüm / numune / rapor) tarihi girilmemiş');
  const per = periyotGun(p);
  if (!per) return eksik('Periyot belirlenemedi (debi / eşdeğer nüfus tablo dışı)');
  const sonTarih = per.ay ? ayEkle(son, per.ay) : gunEkle(son, per.gun!);
  const aksiyon = p.hazirlik_ay ? ayEkle(sonTarih, -p.hazirlik_ay) : gunEkle(sonTarih, -(p.hazirlik_gun ?? 0));
  return sonuc(
    bugun,
    sonTarih,
    aksiyon,
    p.aksiyon_adi ?? 'Sonraki işlem',
    `Son işlem ${trTarih(son)}${per.etiket ? ` · ${per.etiket}` : ''}`,
  );
}

function sozlesmeTakvimi(p: Parametreler, k: TesisYukumlulugu, t: TesisBaglami, bugun: Gun): TerminSonucu {
  const bas = k.baslangic ?? t.sozlesme_tarihi;
  if (!bas) return eksik('Sözleşme tarihi girilmemiş');
  const yapilan = olaylar(k, 'gerceklesti');
  const n = yapilan.length;
  // 1. = sözleşme + ilk_gun; n. (n ≥ 2) = sözleşme + (n-1) yıl
  const sonTarih = n === 0 ? gunEkle(bas, p.ilk_gun ?? 0) : ayEkle(bas, 12 * n);
  const aksiyon = gunEkle(sonTarih, -(p.hazirlik_gun ?? 0));
  return sonuc(
    bugun,
    sonTarih,
    aksiyon,
    `${n + 1}. ${p.aksiyon_adi ?? 'gerçekleşme'}`,
    n ? `${n} kez yapıldı · son ${trTarih(yapilan[n - 1])}` : 'Henüz yapılmadı',
  );
}

function yenilenenSozlesme(p: Parametreler, k: TesisYukumlulugu, bugun: Gun): TerminSonucu {
  if (!k.baslangic) return eksik('Sözleşme tarihi girilmemiş');
  const sure = p.sure_yil ?? 1;
  const ilkBitis = ayEkle(k.baslangic, 12 * sure);
  let sonraki = ilkBitis;
  let aciklama = 'İlk dönem yürürlükte';
  if (bugun > ilkBitis) {
    const yen = p.yenileme_yil ?? 1;
    if (p.yenileme && yen > 0) {
      let i = 1;
      while ((sonraki = ayEkle(k.baslangic, 12 * (sure + yen * i))) < bugun) i++;
      aciklama = 'Otomatik yenilendi';
    } else {
      aciklama = 'Süresi doldu — yenilenmedi';
    }
  }
  const aksiyon = gunEkle(sonraki, -(p.hazirlik_gun ?? 0));
  return sonuc(bugun, sonraki, aksiyon, p.aksiyon_adi ?? 'Yenileme', aciklama);
}

function donemselRapor(p: Parametreler, k: TesisYukumlulugu, bugun: Gun): TerminSonucu {
  if (!k.baslangic || !p.periyot_ay) return eksik('İzleme başlangıcı veya periyot girilmemiş');
  const sunulan = olaylar(k, 'sunuldu').length;
  const n = sunulan + 1;
  const donemSonu = ayEkle(k.baslangic, n * p.periyot_ay);
  const sunum = gunEkle(donemSonu, p.sunum_gun ?? 0);
  return sonuc(
    bugun,
    sunum,
    sunum,
    `${n}. dönem raporu`,
    `${n}. dönem: ${trTarih(ayEkle(k.baslangic, (n - 1) * p.periyot_ay))} – ${trTarih(donemSonu)}`,
  );
}

function yillikSabitTarih(p: Parametreler, k: TesisYukumlulugu, bugun: Gun): TerminSonucu {
  if (!p.ay || !p.gun_no) return eksik('Yıllık tarih tanımlı değil');
  const tarihi = (yil: number) =>
    `${yil}-${String(p.ay).padStart(2, '0')}-${String(p.gun_no).padStart(2, '0')}` as Gun;
  const yil = Number(bugun.slice(0, 4));
  let hedef = tarihi(yil) >= bugun ? tarihi(yil) : tarihi(yil + 1);
  // Bu döngü için (önceki hedeften sonra) yapılmışsa bir sonraki yıla geç
  const onceki = tarihi(Number(hedef.slice(0, 4)) - 1);
  if (olaylar(k, 'gerceklesti', 'sunuldu').some((t) => t > onceki && t <= hedef)) {
    hedef = tarihi(Number(hedef.slice(0, 4)) + 1);
  }
  const aksiyon = gunEkle(hedef, -(p.hazirlik_gun ?? 0));
  return sonuc(bugun, hedef, aksiyon, p.aksiyon_adi ?? 'Sunum', '');
}

// ---------------------------------------------------------------------------

export function terminHesapla(
  tur: YukumlulukTuru,
  kayit: TesisYukumlulugu,
  tesis: TesisBaglami,
  bugun: Gun,
): TerminSonucu {
  if (kayit.durum !== 'aktif') {
    const metin = { muaf: 'Muaf', kapsam_disi: 'Kapsam dışı', beklemede: 'Beklemede' }[kayit.durum];
    return { ...eksik(metin), durum: kayit.durum };
  }
  const p: Parametreler = { ...tur.parametreler, ...(kayit.parametreler ?? {}) };
  switch (tur.kural_tipi) {
    case 'bitis_tarihi':
      return bitisTarihi(p, kayit, bugun);
    case 'son_islem_periyot':
      return sonIslemPeriyot(p, kayit, bugun);
    case 'sozlesme_takvimi':
      return sozlesmeTakvimi(p, kayit, tesis, bugun);
    case 'yenilenen_sozlesme':
      return yenilenenSozlesme(p, kayit, bugun);
    case 'donemsel_rapor':
      return donemselRapor(p, kayit, bugun);
    case 'yillik_sabit_tarih':
      return yillikSabitTarih(p, kayit, bugun);
  }
}
