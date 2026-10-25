#!/usr/bin/env python3
"""
GT_Sistem Excel dosyasını Supabase tohum verisine (seed.sql) çevirir.

Kullanım:
    python3 scripts/excel_aktar.py "GT_Sistem_MEVZUAT_2026-10-12.xlsx"            # supabase/seed.sql üretir
    python3 scripts/excel_aktar.py dosya.xlsx --cikti baska.sql --rapor rapor.md

Betik idempotenttir: aynı Excel her seferinde aynı kimlikleri (UUID v5) üretir.
seed.sql müşteri iletişim bilgisi içerir; .gitignore'dadır, depoya girmez.
Aktarım sırasında bulunan veri sorunları rapor dosyasına yazılır.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import unicodedata
import uuid
from collections import defaultdict
from pathlib import Path

import openpyxl

KOK = Path(__file__).resolve().parent.parent
KATALOG = json.loads((KOK / "src/lib/termin/katalog.json").read_text(encoding="utf-8"))
NS = uuid.UUID("6f1c2b9e-1e57-4c55-9d3e-6a0b7e0f6a10")


def kimlik(*parcalar: str) -> str:
    return str(uuid.uuid5(NS, "|".join(parcalar)))


# ---------------------------------------------------------------------------
# yardımcılar
# ---------------------------------------------------------------------------
def tr_kucuk(s: str) -> str:
    return s.replace("I", "ı").replace("İ", "i").lower()


def tr_baslik(s: str) -> str:
    """Türkçe uyumlu baş harf büyütme: 'UĞUR ALPTEKİN' → 'Uğur Alptekin'."""
    def kelime(w: str) -> str:
        w = tr_kucuk(w)
        if not w:
            return w
        ilk = {"i": "İ", "ı": "I"}.get(w[0], w[0].upper())
        return ilk + w[1:]
    return " ".join(kelime(w) for w in s.split())


def normal(s) -> str:
    s = tr_kucuk(str(s or ""))
    s = unicodedata.normalize("NFKD", s.replace("ı", "i"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s)


def metin(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def tarih(v) -> str | None:
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    if isinstance(v, str):
        m = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", v)
        if m:
            return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return None


def metindeki_tarihler(s: str | None) -> list[str]:
    return [f"{y}-{a}-{g}" for g, a, y in re.findall(r"(\d{2})\.(\d{2})\.(\d{4})", s or "")]


def sql(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def sql_dizi(v: list[str]) -> str:
    if not v:
        return "'{}'::text[]"
    return "array[" + ",".join(sql(x) for x in v) + "]::text[]"


class Rapor:
    def __init__(self):
        self.satirlar: dict[str, list[str]] = defaultdict(list)

    def ekle(self, bolum: str, mesaj: str):
        self.satirlar[bolum].append(mesaj)

    def md(self, kaynak: str) -> str:
        out = [f"# Excel aktarım raporu\n\nKaynak: `{kaynak}` · Üretim: {dt.date.today().isoformat()}\n"]
        for b, ms in self.satirlar.items():
            out.append(f"\n## {b}\n")
            out += [f"- {m}" for m in ms]
        return "\n".join(out) + "\n"


# ---------------------------------------------------------------------------
class Aktarici:
    def __init__(self, yol: Path):
        self.wb = openpyxl.load_workbook(yol, data_only=True)
        self.r = Rapor()
        self.tesisler: dict[str, dict] = {}  # gt_kod → kayıt
        self.ad_harita: dict[str, str] = {}  # normal ad → gt_kod
        self.kayitlar: list[dict] = []  # tesis_yukumlulukleri
        self.olaylar: list[dict] = []
        self.izleme: list[dict] = []
        self.kisiler: list[dict] = []
        self.mevzuat: list[dict] = []
        self.matris: list[tuple[str, str, str]] = []
        self.degisiklikler: list[dict] = []
        self.gruplar: list[tuple[str, str, str | None]] = []

    def ws(self, ad):
        return self.wb[ad]

    def satirlar(self, ad, bas):
        ws = self.ws(ad)
        for i, row in enumerate(ws.iter_rows(min_row=bas, values_only=True), bas):
            yield i, row

    # ---- tesis eşleme ------------------------------------------------------
    def ad_ekle(self, ad, kod):
        n = normal(ad)
        if n and n not in self.ad_harita:
            self.ad_harita[n] = kod

    def tesis_bul(self, ad, kod=None, sekme="") -> str | None:
        if kod and re.match(r"^GT-\d{3}$", str(kod).strip()):
            return str(kod).strip()
        n = normal(ad)
        if not n:
            return None
        if n in self.ad_harita:
            return self.ad_harita[n]
        aday = {k for a, k in self.ad_harita.items() if len(a) >= 5 and (a in n or n in a)}
        if len(aday) == 1:
            return aday.pop()
        self.r.ekle("Eşleşmeyen tesis adları", f"{sekme}: “{ad}” hiçbir GT koduna eşlenemedi")
        return None

    # ---- sekmeler ----------------------------------------------------------
    def sektor_gruplari(self):
        for _, r in self.satirlar("Sektor_Gruplari", 4):
            if r[0] and re.match(r"^G\d+$", str(r[0])):
                self.gruplar.append((r[0], metin(r[1]), metin(r[2])))

    def tesis_kayit(self):
        for _, r in self.satirlar("Tesisler", 5):
            kod = metin(r[0])
            if not kod or not re.match(r"^GT-\d{3}$", kod):
                continue
            grup_ham = metin(r[6])
            m = re.search(r"G\d+", grup_ham or "")
            varyant = [v.strip() for v in re.split(r"/", metin(r[10]) or "") if v.strip()]
            t = dict(
                id=kimlik("tesis", kod), gt_kod=kod, kisa_ad=metin(r[1]), resmi_unvan=metin(r[2]),
                il=metin(r[3]), sinif=metin(r[4]), nace_kodlari=metin(r[5]),
                grup_kod=m.group(0) if m else None,
                grup_notu=grup_ham if grup_ham and grup_ham != (m.group(0) if m else None) else None,
                ad_varyantlari=varyant, yetkili=metin(r[7]), telefon=metin(r[9]),
            )
            self.tesisler[kod] = t
            self.ad_ekle(t["kisa_ad"], kod)
            for v in varyant:
                self.ad_ekle(v, kod)
            if not t["il"]:
                self.r.ekle("Eksik tesis künyesi", f"{kod} {t['kisa_ad']}: il / sınıf / NACE girilmemiş")
        # sık geçen ek adlar
        for ad, kod in [("Öztürk", "GT-002"), ("Samsun Avdan Samsun", "GT-003"), ("Samsun Avdan Maraş", "GT-004"),
                        ("Samsun Aydan - Samsun", "GT-003"), ("HN Metal Turgutlu", "GT-008"), ("Hedan", "GT-015"),
                        ("Zirve Osmaz", "GT-012"), ("Panda Akm.", "GT-023"), ("Panda ALM.", "GT-023"),
                        ("Mangan", "GT-027"), ("Mangan (GFB)", "GT-027"), ("Ankara Mangan Maden", "GT-027"),
                        ("Demkar", "GT-026"), ("Yolbulan", "GT-025"), ("Oretec Mineral", "GT-029"), ("Oretec", "GT-029"),
                        ("Özdemirgil", "GT-018"), ("Özdemirgil Madencilik", "GT-018"), ("Limak Keşan", "GT-028"),
                        ("Limak Keşan Kaolen", "GT-028"), ("PANAB Van", "GT-020"), ("Panab VAN", "GT-020"),
                        ("MND Kahvaltıcılık", "GT-024"), ("ENERJİSA", "GT-001"), ("Enerjisa", "GT-001"),
                        ("Has Niğdeler", "GT-007"), ("ÖZTÜRK ENERJI", "GT-002"), ("BARUTÇUOĞLU", "GT-016"),
                        ("HEDAN", "GT-015"), ("LİMAK AYAŞ", "GT-017"), ("YOLBULAN ÇELİK", "GT-025")]:
            self.ad_ekle(ad, kod)

    def sozlesmeler(self):
        nace_fark = []
        for _, r in self.satirlar("Sözleşme Takip", 3):
            kod = self.tesis_bul(r[0], r[7], "Sözleşme Takip")
            if not kod or kod not in self.tesisler:
                continue
            t = self.tesisler[kod]
            t["sozlesme_tarihi"] = tarih(r[1])
            t["sozlesme_kapsami"] = metin(r[2])
            izin = metin(r[3])
            t["izin_lisans_konusu"] = None if izin in ("-", None) else izin
            nace = metin(r[4])
            if nace and t.get("nace_kodlari") and normal(nace) not in normal(t["nace_kodlari"]):
                nace_fark.append(f"{kod} {t['kisa_ad']}: Tesisler sekmesinde {t['nace_kodlari']}, Sözleşme sekmesinde {nace}")
        for m in nace_fark:
            self.r.ekle("NACE kodu iki sekmede farklı", m)

    def mevzuat_notlari(self):
        for _, r in self.satirlar("Tesis_Mevzuat_Notlari", 4):
            if r[0] in self.tesisler:
                self.tesisler[r[0]]["mevzuat_notu"] = metin(r[5])

    def kisi_listesi(self):
        tesis_kodlari: list[str] = []
        firma = None
        for i, r in self.satirlar("Tesis Sorumluları&Görevleri", 2):
            if metin(r[0]):
                firma = metin(r[0])
            if metin(r[1]):
                ad = metin(r[1])
                if " ve " in ad:  # "Samsun Avdan Maraş ve Öztürk Enerji"
                    tesis_kodlari = [k for k in (self.tesis_bul(p, sekme="Tesis Sorumluları") for p in ad.split(" ve ")) if k]
                else:
                    k = self.tesis_bul(ad, sekme="Tesis Sorumluları")
                    tesis_kodlari = [k] if k else []
                for k in tesis_kodlari:
                    if firma:
                        self.tesisler[k]["firma_grubu"] = tr_baslik(firma)
            ana = metin(r[2]) if metin(r[1]) else None
            kisi, gorev, icerik, tel = metin(r[3]), metin(r[4]), metin(r[5]), metin(r[6])
            imza = "imza" in tr_kucuk(icerik or "") or "imza" in tr_kucuk(gorev or "")
            if ana:
                m = re.match(r"^(.*?)\s*\((.*)\)\s*$", ana)
                ana_ad, ana_gorev = (m.group(1), tr_baslik(m.group(2))) if m else (ana, None)
                if not kisi or normal(kisi) == normal(ana_ad):
                    # Satırdaki kişi ana yetkilinin kendisi
                    for k in tesis_kodlari:
                        self.kisi_ekle(k, tr_baslik(ana_ad), gorev or ana_gorev or "Ana yetkili", icerik, tel, True, i)
                    continue
                for k in tesis_kodlari:
                    self.kisi_ekle(k, tr_baslik(ana_ad), ana_gorev or "Ana yetkili", None, None, False, i)
            if not kisi and not gorev:
                continue
            for k in tesis_kodlari:
                self.kisi_ekle(k, kisi or f"[{gorev}]", gorev, icerik, tel, imza, i)

    def kisi_ekle(self, kod, ad, gorev, icerik, tel, imza, satir):
        ad = re.sub(r"\s+", " ", ad.replace("..", " ")).strip()
        if any(normal(k["ad_soyad"]) == normal(ad) and k["tesis"] == kod for k in self.kisiler):
            return
        tel = re.sub(r"\D", "", str(tel)) if tel else None
        self.kisiler.append(dict(id=kimlik("kisi", kod, normal(ad)), tesis=kod, ad_soyad=ad, gorev=gorev,
                                 sorumluluklar=icerik, telefon=tel, imza_yetkisi=imza))

    # ---- yükümlülükler -----------------------------------------------------
    def kayit(self, kod, tur, *, etiket="", durum="aktif", notlar=None, olaylar=(), **alanlar):
        k = dict(id=kimlik("ty", kod or "-", tur, etiket), tesis=kod, tur=tur, etiket=etiket, durum=durum,
                 notlar=notlar, parametreler={}, gecerlilik_bitis=None, belge_tarihi=None, son_islem=None,
                 baslangic=None)
        k.update(alanlar)
        self.kayitlar.append(k)
        gorulen = set()
        for tarih_, tur_ in olaylar:
            if (tarih_, tur_) in gorulen:
                self.r.ekle("Mükerrer olay kayıtları (bir kez aktarıldı)",
                            f"{kod} {self.tesisler.get(kod, {}).get('kisa_ad', etiket)} · {tur}: {tarih_} iki kez girilmiş")
                continue
            gorulen.add((tarih_, tur_))
            self.olaylar.append(dict(id=kimlik("olay", k["id"], tarih_, tur_), ty=k["id"], tarih=tarih_, tur=tur_))
        return k

    @staticmethod
    def bos_tarih_durumu(not_: str | None) -> str:
        n = tr_kucuk(not_ or "")
        if "muaf" in n:
            return "muaf"
        if any(s in n for s in ("henüz", "bekleniyor", "değerlendirme", "süreç", "başvuru", "lisans alınınca", "hazırlık")):
            return "beklemede"
        return "aktif"

    def bitis_sekmesi(self, sekme, tur, tarih_kol, not_kol, kod_kol, bas=4):
        for _, r in self.satirlar(sekme, bas):
            if not metin(r[1]):
                continue
            kod = self.tesis_bul(r[1], r[kod_kol], sekme)
            if not kod:
                continue
            d = tarih(r[tarih_kol])
            not_ = " · ".join(x for x in (metin(c) for c in r[not_kol:kod_kol]) if x) or None
            durum = "aktif" if d else self.bos_tarih_durumu(not_)
            if not d and tr_kucuk(not_ or "") in ("yok",):
                durum = "kapsam_disi"
            etiket = ""
            if tur == "kapasite" and kod == "GT-020":
                etiket = "Elektrik üretim" if "ELEKTR" in (not_ or "") else "Ayrıştırma"
            olaylar = []
            if tur == "sifir_atik":
                for t_ in metindeki_tarihler(not_):
                    if "BAŞVURULDU" in (not_ or ""):
                        olaylar.append((t_, "sunuldu"))
            self.kayit(kod, tur, etiket=etiket, durum=durum, notlar=not_, gecerlilik_bitis=d, olaylar=olaylar)

    def eayp(self):
        for _, r in self.satirlar("EAYP", 4):
            if not metin(r[1]):
                continue
            kod = self.tesis_bul(r[1], r[11], "EAYP")
            if not kod:
                continue
            ek = metin(r[2])
            d = tarih(r[3])
            notlar = [x for x in (metin(c) for c in r[6:11]) if x]
            not_ = " · ".join(notlar) or None
            p = {"ek_turu": ek}
            m = re.search(r"(\d+)\s*ay önce", not_ or "")
            if m and m.group(1) != "1":
                p["asamalar"] = [{"ad": "Sunum", "ay": int(m.group(1))}]
            olaylar = []
            for parca in notlar:
                ust = parca.upper()
                tur_ = ("eksiklik_yanitlandi" if "DÖNÜLDÜ" in ust or "DÖNÜLD" in ust
                        else "eksiklik_geldi" if "EKSİKLİK GELDİ" in ust
                        else "sunuldu" if "SUNULDU" in ust else None)
                for t_ in metindeki_tarihler(parca):
                    if tur_:
                        olaylar.append((t_, tur_))
            durum = "aktif" if d else ("beklemede" if any(s in tr_kucuk(not_ or "") for s in ("bekleniyor", "belirsiz", "sunulacak", "hazırlanmadı")) else "aktif")
            self.kayit(kod, "eayp", durum=durum, notlar=not_, gecerlilik_bitis=d, parametreler=p, olaylar=olaylar)

    def bkkr(self):
        for _, r in self.satirlar("Bağlantı KK Ruhsat Takip", 7):
            if not metin(r[0]) or "ÖRNEK" in str(r[0]) or str(r[0]).startswith(("Lejant", "MAVİ", "KIRMIZI", "SARI", "TURUNCU", "YEŞİL", "Not")):
                continue
            kod = self.tesis_bul(r[0], r[9], "BKKR")
            if not kod:
                continue
            kapsam = metin(r[1])
            not_ = " · ".join(x for x in (metin(r[2]), metin(r[8])) if x) or None
            d = tarih(r[3])
            if kapsam == "TABİ DEĞİL":
                durum = "kapsam_disi"
            elif kapsam == "TABİ" and not d and "HENÜZ" in (not_ or ""):
                durum = "beklemede"
            else:
                durum = "aktif"
            if not kapsam:
                not_ = "Kapsam belirlenmemiş" + (f" · {not_}" if not_ else "")
            self.kayit(kod, "bkkr", durum=durum, notlar=not_, belge_tarihi=d)

    def emisyon(self):
        for _, r in self.satirlar("Emisyon Ölçümleri", 5):
            if not metin(r[0]) or not metin(r[8]):
                continue
            kod = self.tesis_bul(r[0], r[8], "Emisyon")
            d = tarih(r[1])
            not_ = metin(r[7])
            if d and not_ == "Son rapor tarihi eksik":
                not_ = None
            olaylar = [(t_, "gerceklesti") for t_ in (tarih(r[6]),) if t_]
            self.kayit(kod, "emisyon", notlar=not_, son_islem=d, olaylar=olaylar)

    def sozlesme_serisi(self, sekme, tur, gercek_kol, not_kol, kod_kol):
        for _, r in self.satirlar(sekme, 6):
            if not metin(r[kod_kol]):
                continue
            kod = self.tesis_bul(r[0], r[kod_kol], sekme)
            bas = tarih(r[1])
            yapilan = [tarih(c) for c in r[gercek_kol:gercek_kol + 5]]
            yapilan = [y for y in yapilan if y]
            not_ = metin(r[not_kol]) if not_kol is not None else None
            durum = "muaf" if "MUAF" in (not_ or "").upper() else "aktif"
            tesis_soz = self.tesisler.get(kod, {}).get("sozlesme_tarihi")
            if bas and tesis_soz and bas != tesis_soz:
                self.r.ekle("Sözleşme tarihi sekmeler arasında farklı", f"{kod}: {sekme} {bas}, Sözleşme Takip {tesis_soz}")
            if bas and yapilan and min(yapilan) < bas:
                self.r.ekle("Sözleşmeden önce girilmiş gerçekleşme", f"{kod} {sekme}: sözleşme {bas}, ilk kayıt {min(yapilan)}")
            self.kayit(kod, tur, durum=durum, notlar=not_,
                       baslangic=bas if bas and bas != tesis_soz else None,
                       olaylar=[(y, "gerceklesti") for y in yapilan])
            if kod in self.tesisler and not tesis_soz and bas:
                self.tesisler[kod]["sozlesme_tarihi"] = bas

    def yenilenen(self, sekme, tur):
        for _, r in self.satirlar(sekme, 7):
            if not metin(r[10]):
                continue
            kod = self.tesis_bul(r[0], r[10], sekme)
            ham = r[1]
            d = tarih(ham)
            not_ = metin(r[9])
            durum = "aktif"
            if isinstance(ham, str) and not d:
                not_ = " · ".join(x for x in (ham.strip().capitalize(), not_) if x)
                durum = "muaf"
            p = {}
            if r[2] not in (None, ""):
                p["sure_yil"] = r[2]
            if metin(r[3]):
                p["yenileme"] = metin(r[3]).upper() == "VAR"
            if r[4] not in (None, ""):
                p["yenileme_yil"] = r[4]
            self.kayit(kod, tur, durum=durum, notlar=not_, baslangic=d, parametreler=p)

    def atiksu(self):
        for _, r in self.satirlar("Atıksu Numune Alım Takip", 5):
            if not isinstance(r[0], int) or not metin(r[1]):
                continue
            kod = self.tesis_bul(r[1], r[16], "Atıksu numune")
            p = {"atiksu_niteligi": "evsel" if tr_kucuk(metin(r[2]) or "").startswith("evsel") else "endustriyel"}
            if isinstance(r[3], (int, float)):
                p["debi_veya_en"] = r[3]
            self.kayit(kod, "atiksu_numune", son_islem=tarih(r[10]), parametreler=p, notlar=metin(r[15]))

    def izleme_bloklari(self, sekme, tur, tarih_kolonlari, nokta_kol=None):
        ws = self.ws(sekme)
        kod = None
        son = defaultdict(lambda: None)
        for i, r in enumerate(ws.iter_rows(min_row=1, values_only=True), 1):
            a = metin(r[0])
            if a and "—" in a and i > 3:
                ad = a.split("—")[0].strip()
                kod = self.tesis_bul(ad, sekme=sekme)
                if kod:
                    son[kod]  # bloğu kaydet
                continue
            if not kod or not a or a in ("Dönem",):
                continue
            for kol in tarih_kolonlari:
                d = tarih(r[kol])
                if d:
                    self.izleme.append(dict(id=kimlik("iz", tur, kod, a, str(nokta_kol and r[nokta_kol]), d), tesis=kod, tur=tur,
                                            donem=a, numune_noktasi=metin(r[nokta_kol]) if nokta_kol is not None else None,
                                            tarih=d))
                    son[kod] = max(filter(None, [son[kod], d]))
        for k, d in son.items():
            self.kayit(k, tur, son_islem=d)

    def vidanjor(self):
        for _, r in self.satirlar("Vidanjör Çekim Takip", 4):
            if not metin(r[0]):
                continue
            kod = self.tesis_bul(r[0], sekme="Vidanjör")
            d = tarih(r[1])
            if kod and d:
                self.izleme.append(dict(id=kimlik("iz", "vidanjor", kod, d), tesis=kod, tur="vidanjor", tarih=d,
                                        makbuz_dosyada=metin(r[2]) == "VAR", aciklama=metin(r[3])))

    def ced(self):
        ws = self.ws("ÇED Dönem Takvimi")
        for i, r in self.satirlar("ÇED İzleme Takip", 5):
            if not isinstance(r[0], int) or not metin(r[1]):
                continue
            proje = metin(r[1])
            blok = 6 + (r[0] - 1) * 20
            sunulan = [tarih(ws.cell(row=s, column=6).value) for s in range(blok, blok + 16)]
            kod = self.tesis_bul(proje, sekme="ÇED") if proje in ("PANAB Van", "Samsun Aydan - Samsun") else None
            notlar = " · ".join(x for x in (f"Ruhsat no {metin(r[2])}" if metin(r[2]) else None,
                                            f"İş türü: {metin(r[3])}", f"Saha firması: {metin(r[15])}" if metin(r[15]) else None,
                                            metin(r[16])) if x)
            self.kayit(kod, "ced_izleme", etiket=proje, baslangic=tarih(r[5]), notlar=notlar,
                       parametreler={"periyot_ay": r[4], "sunum_gun": r[6]},
                       olaylar=[(s, "sunuldu") for s in sunulan if s])

    # ---- mevzuat -----------------------------------------------------------
    def mevzuat_aktar(self):
        def rg(s):
            d = tarih(s)
            m = re.search(r"/\s*(\d+)", s or "")
            return d, (m.group(1) if m else None)

        for i, r in self.satirlar("Mevzuat_Kutuphanesi", 5):
            if not metin(r[2]):
                continue
            ad = metin(r[2])
            d, sayi = rg(metin(r[3]))
            self.mevzuat.append(dict(id=kimlik("mev", normal(ad)), kategori=metin(r[0]), tur=metin(r[1]), ad=ad,
                                     rg_metin=metin(r[3]), rg_tarih=d, rg_sayi=sayi,
                                     teyit_gerekli="(*)" in ad or "KONTROL" in (metin(r[3]) or "")))
        gruplar = [f"G{i}" for i in range(1, 11)]
        for i, r in self.satirlar("Mevzuat_Matrisi", 7):
            if not isinstance(r[0], int):
                continue
            ad, rgm = metin(r[2]), metin(r[3])
            adaylar = [m for m in self.mevzuat if rgm and m["rg_metin"] == rgm]
            if len(adaylar) > 1:
                kel = set(re.findall(r"\w{4,}", tr_kucuk(ad)))
                adaylar.sort(key=lambda m: -len(kel & set(re.findall(r"\w{4,}", tr_kucuk(m["ad"])))))
            if adaylar:
                m = adaylar[0]
            else:
                d, sayi = rg(rgm)
                m = dict(id=kimlik("mev", normal(ad)), kategori=None, tur=metin(r[1]), ad=ad, rg_metin=rgm, rg_tarih=d,
                         rg_sayi=sayi, teyit_gerekli="(*)" in (ad or ""))
                self.mevzuat.append(m)
            m["kapsam_notu"] = metin(r[14])
            for g, v in zip(gruplar, r[4:14]):
                if metin(v) in ("X", "K"):
                    self.matris.append((m["id"], g, metin(v)))
        for _, r in self.satirlar("Mevzuat_Takip", 5):
            if not metin(r[3]):
                continue
            self.degisiklikler.append(dict(id=kimlik("deg", normal(r[3]), str(r[0])), tespit_tarihi=tarih(r[0]) or metin(r[0]),
                                           rg_metin=metin(r[1]), tur=metin(r[2]), ad=metin(r[3]), ozet=metin(r[4]),
                                           etkilenen_gruplar=metin(r[5]), etkilenen_tesisler=metin(r[6]), aksiyon=metin(r[7]),
                                           durum="acik" if metin(r[8]) == "Açık" else "kapali"))

    # ---- çalıştır ----------------------------------------------------------
    def calistir(self):
        self.sektor_gruplari()
        self.tesis_kayit()
        self.sozlesmeler()
        self.mevzuat_notlari()
        self.kisi_listesi()
        self.bitis_sekmesi("GFB ve İzin-Lisans", "gfb_izin", 2, 6, 7)
        self.bitis_sekmesi("MSS Sigortası", "mss", 2, 5, 6)
        self.bitis_sekmesi("Sıfır Atık Belgesi", "sifir_atik", 2, 7, 11)
        self.bitis_sekmesi("Kapasite Raporu", "kapasite", 2, 6, 7)
        self.eayp()
        self.bkkr()
        self.emisyon()
        self.sozlesme_serisi("İç Tetkik Takibi", "ic_tetkik", 8, None, 15)
        self.sozlesme_serisi("Eğitim Takip", "egitim", 7, 14, 15)
        self.yenilenen("Bitkisel Atıkyağ Sözleşmesi", "bitkisel_atik_yag")
        self.yenilenen("Tıbbi Atık Sözleşmesi", "tibbi_atik")
        self.atiksu()
        self.izleme_bloklari("Depo Gazı Verileri", "depo_gazi", [1, 2])
        self.izleme_bloklari("Sızıntı Suyu Analizleri", "sizinti_suyu", [2, 3])
        self.izleme_bloklari("Gözlem Kuyusu Analizleri", "gozlem_kuyusu", [2, 3], nokta_kol=1)
        self.vidanjor()
        self.ced()
        self.mevzuat_aktar()
        self.denetle()

    def denetle(self):
        kodlar = {(k["tesis"], k["tur"], k["etiket"]) for k in self.kayitlar}
        if len(kodlar) != len(self.kayitlar):
            sayac = defaultdict(int)
            for k in self.kayitlar:
                sayac[(k["tesis"], k["tur"], k["etiket"])] += 1
            for anahtar, n in sayac.items():
                if n > 1:
                    raise SystemExit(f"Aynı yükümlülük iki kez üretildi: {anahtar}")
        for k in self.kayitlar:
            if k["tesis"] and k["tesis"] not in self.tesisler:
                raise SystemExit(f"Bilinmeyen tesis kodu: {k['tesis']}")
        # Tesisler sekmesinde olmayıp yükümlülüklerde görünenler
        olan = {k["tesis"] for k in self.kayitlar if k["tesis"]}
        for kod, t in self.tesisler.items():
            if kod not in olan:
                self.r.ekle("Hiç yükümlülüğü olmayan tesis", f"{kod} {t['kisa_ad']}")

    # ---- SQL ---------------------------------------------------------------
    def sql(self) -> str:
        o = ["-- Otomatik üretildi: scripts/excel_aktar.py · elle düzenlemeyin", "begin;", ""]
        o.append("-- sektör grupları")
        for kod, ad, acik in self.gruplar:
            o.append(f"insert into public.sektor_gruplari (kod, ad, aciklama) values ({sql(kod)}, {sql(ad)}, {sql(acik)}) "
                     "on conflict (kod) do update set ad = excluded.ad, aciklama = excluded.aciklama;")
        o.append("\n-- yükümlülük türleri (kural kataloğu)")
        for y in KATALOG:
            o.append(
                "insert into public.yukumluluk_turleri (id, kod, ad, kural_tipi, parametreler, cezai_risk, hedef_klasor, mevzuat_dayanagi, aciklama, sira) "
                f"values ({sql(kimlik('tur', y['kod']))}, {sql(y['kod'])}, {sql(y['ad'])}, {sql(y['kural_tipi'])}, {sql(y['parametreler'])}, "
                f"{sql(y['cezai_risk'])}, {sql(y['hedef_klasor'])}, {sql(y['mevzuat_dayanagi'])}, {sql(y['aciklama'])}, {y['sira']}) "
                "on conflict (kod) do update set ad = excluded.ad, kural_tipi = excluded.kural_tipi, parametreler = excluded.parametreler, "
                "cezai_risk = excluded.cezai_risk, hedef_klasor = excluded.hedef_klasor, mevzuat_dayanagi = excluded.mevzuat_dayanagi, "
                "aciklama = excluded.aciklama, sira = excluded.sira;")
        o.append("\n-- tesisler")
        for t in self.tesisler.values():
            alanlar = ["id", "gt_kod", "kisa_ad", "resmi_unvan", "il", "sinif", "nace_kodlari", "grup_kod", "grup_notu",
                       "firma_grubu", "sozlesme_tarihi", "sozlesme_kapsami", "izin_lisans_konusu", "mevzuat_notu"]
            degerler = [sql(t.get(a)) for a in alanlar] + [sql_dizi(t["ad_varyantlari"])]
            guncel = ", ".join(f"{a} = excluded.{a}" for a in alanlar[2:] + ["ad_varyantlari"])
            o.append(f"insert into public.tesisler ({', '.join(alanlar)}, ad_varyantlari) values ({', '.join(degerler)}) "
                     f"on conflict (gt_kod) do update set {guncel};")
        o.append("\n-- kişiler")
        for k in self.kisiler:
            o.append("insert into public.kisiler (id, tesis_id, ad_soyad, gorev, sorumluluklar, telefon, imza_yetkisi) values "
                     f"({sql(k['id'])}, (select id from public.tesisler where gt_kod = {sql(k['tesis'])}), {sql(k['ad_soyad'])}, "
                     f"{sql(k['gorev'])}, {sql(k['sorumluluklar'])}, {sql(k['telefon'])}, {sql(k['imza_yetkisi'])}) "
                     "on conflict (id) do update set gorev = excluded.gorev, sorumluluklar = excluded.sorumluluklar, "
                     "telefon = excluded.telefon, imza_yetkisi = excluded.imza_yetkisi;")
        o.append("\n-- tesis yükümlülükleri")
        for k in self.kayitlar:
            tesis = f"(select id from public.tesisler where gt_kod = {sql(k['tesis'])})" if k["tesis"] else "null"
            o.append(
                "insert into public.tesis_yukumlulukleri (id, tesis_id, tur_id, etiket, durum, gecerlilik_bitis, belge_tarihi, son_islem, baslangic, parametreler, notlar) values "
                f"({sql(k['id'])}, {tesis}, (select id from public.yukumluluk_turleri where kod = {sql(k['tur'])}), {sql(k['etiket'])}, "
                f"{sql(k['durum'])}, {sql(k['gecerlilik_bitis'])}, {sql(k['belge_tarihi'])}, {sql(k['son_islem'])}, {sql(k['baslangic'])}, "
                f"{sql(k['parametreler'])}, {sql(k['notlar'])}) "
                "on conflict (id) do update set durum = excluded.durum, gecerlilik_bitis = excluded.gecerlilik_bitis, belge_tarihi = excluded.belge_tarihi, "
                "son_islem = excluded.son_islem, baslangic = excluded.baslangic, parametreler = excluded.parametreler, notlar = excluded.notlar;")
        o.append("\n-- olaylar")
        for e in self.olaylar:
            o.append(f"insert into public.yukumluluk_olaylari (id, tesis_yukumluluk_id, tarih, tur) values ({sql(e['id'])}, {sql(e['ty'])}, {sql(e['tarih'])}, {sql(e['tur'])}) on conflict (id) do nothing;")
        o.append("\n-- izleme kayıtları")
        for z in self.izleme:
            o.append("insert into public.izleme_kayitlari (id, tesis_id, tur, donem, numune_noktasi, tarih, makbuz_dosyada, aciklama) values "
                     f"({sql(z['id'])}, (select id from public.tesisler where gt_kod = {sql(z['tesis'])}), {sql(z['tur'])}, {sql(z.get('donem'))}, "
                     f"{sql(z.get('numune_noktasi'))}, {sql(z['tarih'])}, {sql(z.get('makbuz_dosyada'))}, {sql(z.get('aciklama'))}) on conflict (id) do nothing;")
        o.append("\n-- mevzuat")
        for m in self.mevzuat:
            o.append("insert into public.mevzuat (id, kategori, tur, ad, rg_metin, rg_tarih, rg_sayi, teyit_gerekli, kapsam_notu) values "
                     f"({sql(m['id'])}, {sql(m['kategori'])}, {sql(m['tur'])}, {sql(m['ad'])}, {sql(m['rg_metin'])}, {sql(m['rg_tarih'])}, "
                     f"{sql(m['rg_sayi'])}, {sql(m['teyit_gerekli'])}, {sql(m.get('kapsam_notu'))}) on conflict (id) do update set "
                     "kategori = excluded.kategori, tur = excluded.tur, rg_metin = excluded.rg_metin, rg_tarih = excluded.rg_tarih, "
                     "rg_sayi = excluded.rg_sayi, kapsam_notu = excluded.kapsam_notu;")
        for mid, g, v in self.matris:
            o.append(f"insert into public.mevzuat_matrisi (mevzuat_id, grup_kod, uygulama) values ({sql(mid)}, {sql(g)}, {sql(v)}) on conflict do nothing;")
        for d in self.degisiklikler:
            o.append("insert into public.mevzuat_degisiklikleri (id, tespit_tarihi, rg_metin, tur, ad, ozet, etkilenen_gruplar, etkilenen_tesisler, aksiyon, durum, kaynak) values "
                     f"({sql(d['id'])}, {sql(d['tespit_tarihi'])}, {sql(d['rg_metin'])}, {sql(d['tur'])}, {sql(d['ad'])}, {sql(d['ozet'])}, "
                     f"{sql(d['etkilenen_gruplar'])}, {sql(d['etkilenen_tesisler'])}, {sql(d['aksiyon'])}, {sql(d['durum'])}, 'excel') on conflict do nothing;")
        o.append("\ncommit;\n")
        return "\n".join(o)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("excel")
    ap.add_argument("--cikti", default=str(KOK / "supabase/seed.sql"))
    ap.add_argument("--rapor", default=str(KOK / "supabase/aktarim_raporu.md"))
    a = ap.parse_args()
    ak = Aktarici(Path(a.excel))
    ak.calistir()
    Path(a.cikti).write_text(ak.sql(), encoding="utf-8")
    Path(a.rapor).write_text(ak.r.md(Path(a.excel).name), encoding="utf-8")
    print(f"{len(ak.tesisler)} tesis · {len(ak.kisiler)} kişi · {len(ak.kayitlar)} yükümlülük · {len(ak.olaylar)} olay · "
          f"{len(ak.izleme)} izleme · {len(ak.mevzuat)} mevzuat ({len(ak.matris)} matris hücresi) · {len(ak.degisiklikler)} değişiklik",
          file=sys.stderr)
    print(f"→ {a.cikti}\n→ {a.rapor}", file=sys.stderr)


if __name__ == "__main__":
    main()
