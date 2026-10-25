# GT_Sistem Excel dosyasında bulunan sorunlar (12.10.2026 sürümü)

Aktarım sırasında ve kural motoru testlerinde ortaya çıktı. Aktarımın her çalıştırmada ürettiği güncel liste: `supabase/aktarim_raporu.md`.

## Hesaplamayı etkileyenler
1. **KOKPİT sekmesi canlı değil.** Değerler 16.07.2026'da sabitlenip yapıştırılmış; formül yok. "İzleme uyarıları" bölümünde Panab Van satırları üç kez tekrar ediyor.
2. **Mükerrer gerçekleşme kayıtları:** Limak Ayaş ve Panab Van (iç tetkik), Samsun BSB, Barutçuoğlu, Özdemirgil ve Panab Adıyaman (eğitim). Excel bunları ayrı kayıt sayıyor. Örneğin Limak Ayaş'ın 3. iç tetkiki 01.05.2026'da gecikmişken Excel'de güncel görünüyor.
3. **Kapasite raporu kuralı tutarsız:** Sekme başlığında "C − 60 gün", formülde −75 gün. Sistem 75 günü kullanıyor (erken uyarı). Doğrusunu teyit edin.
4. **Sıfır atık formülü** başvuru açılışını yenileme sonrası tarihten hesaplıyor (bkz. KURAL_KATALOGU.md).

## Veri tutarsızlıkları
5. **NACE kodları iki sekmede yer değiştirmiş:** GT-026 Demkar ve GT-028 Limak Keşan (Tesisler ↔ Sözleşme Takip). GT-027 Mangan da benzer şekilde karışık.
6. **Sözleşmeden önce girilmiş gerçekleşmeler:** GT-025, GT-026, GT-028 (iç tetkik), GT-017, GT-028 (eğitim). Ya sözleşme tarihi ya da gerçekleşme tarihi yanlış.
7. **GT-031 Sahalar Metal ve GT-032 Tohma Biyogaz** kayıt defterinde var ama il, sınıf, NACE ve yükümlülük bilgisi yok.
8. **Tesisler sekmesinde tüm e-posta adresleri aynı test adresi.** Sisteme aktarılmadı; tesis kişileri ayrıca girilmeli.
9. **Tesis_Mevzuat_Notlari'ndaki "KOKPİT: 3 gün / 116 gün" gibi ifadeler** yazıldığı günün kalan süresini içeriyor ve eskidi.

## Veri eksikleri (aktif kayıtlarda tarih yok)
Kokpit → "Veri eksik" filtresi türe göre listeler. En çok eksik olanlar: tıbbi atık sözleşmesi, emisyon (son rapor tarihi), bitkisel atık yağ, BKKR.
