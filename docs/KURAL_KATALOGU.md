# Kural kataloğu

Excel'deki termin sekmelerinin hangi kural tipine çevrildiği. Varsayılanlar `src/lib/termin/katalog.json` dosyasındadır; tesis bazında ezilebilir.

Durum eşikleri (tüm türler): aksiyon tarihi geçtiyse **Gecikti**, 30 gün içindeyse **30 gün içinde**, 90 gün içindeyse **90 gün içinde**, daha uzaksa **Planlı**.
Sunuldu / eksiklik / onay olayı girilmiş kayıtlar **Süreçte** sayılır; gecikmiş görünmez.

| Tür | Excel sekmesi | Kural tipi | Kural | Risk |
|---|---|---|---|---|
| GFB / Çevre İzin-Lisans | GFB ve İzin-Lisans | bitis_tarihi | Bitiş −240 gün ön hazırlık, −180 gün başvuru | Yüksek |
| Mali Sorumluluk Sigortası | MSS Sigortası | bitis_tarihi | Bitiş −14 gün yenileme | Var |
| Sıfır Atık Belgesi | Sıfır Atık Belgesi | bitis_tarihi | Bitiş −90 gün başvuru açılışı | Var |
| Kapasite Raporu | Kapasite Raporu | bitis_tarihi | Bitiş −75 gün başvuru | Düşük |
| Endüstriyel Atık Yönetim Planı | EAYP | bitis_tarihi | Bitiş −30 gün sunum (tesise göre 3 ay) | Var |
| Bağlantı Kalite Kontrol Ruhsatı | Bağlantı KK Ruhsat Takip | bitis_tarihi | Ruhsat + 36 ay; bitiş −2 ay işlem başlatma | Var |
| Emisyon Ölçümü | Emisyon Ölçümleri | son_islem_periyot | Son rapor + 24 ay; −3 ay ölçüme başlama | Var |
| Atıksu İç İzleme | Atıksu Numune Alım Takip | son_islem_periyot | Periyot SKKY tablosundan (debi / eşdeğer nüfus) | Var |
| Depo Gazı | Depo Gazı Verileri | son_islem_periyot | Aylık | Var |
| Sızıntı Suyu | Sızıntı Suyu Analizleri | son_islem_periyot | 3 ayda bir | Var |
| Gözlem Kuyusu | Gözlem Kuyusu Analizleri | son_islem_periyot | 6 ayda bir | Var |
| İç Tetkik | İç Tetkik Takibi | sozlesme_takvimi | 1. = sözleşme + 30 gün; sonra her yıldönümü | Var |
| Eğitim | Eğitim Takip | sozlesme_takvimi | 1. = sözleşme + 90 gün; sonra her yıldönümü | Düşük |
| Bitkisel Atık Yağ Sözleşmesi | Bitkisel Atıkyağ Sözleşmesi | yenilenen_sozlesme | Süre + otomatik yenileme; −30 gün | Düşük |
| Tıbbi Atık Sözleşmesi | Tıbbi Atık Sözleşmesi | yenilenen_sozlesme | Süre + otomatik yenileme; −30 gün | Var |
| ÇED İzleme Raporu | ÇED İzleme Takip + Dönem Takvimi | donemsel_rapor | n. dönem sonu + sunum süresi | Yüksek |
| Atık Beyanı (TABS) | Kurallar | yillik_sabit_tarih | Her yıl 31 Mart; −30 gün | Var |

## Excel'den farklı davranışlar (bilinçli)
- **Mükerrer gerçekleşme tarihleri tek sayılır.** Excel aynı günü iki kez girilmiş iç tetkik/eğitimi iki ayrı kayıt sayıp sıradaki terminleri bir yıl ileri atıyordu.
- **Sıfır atık başvuru açılışı mevcut bitişten 90 gün önce hesaplanır.** Excel formülü yenileme sonrası (+5 yıl) bitişten 90 gün önceyi hesaplıyordu.
- **İç tetkik / eğitim 5 kayıtla sınırlı değil.** Excel 5. kayıttan sonra "Tamamlandı" diyordu.
- **Depo gazı, sızıntı suyu ve gözlem kuyusu son ölçümden itibaren kayan periyotla hesaplanır.** Excel'de takvim dönemleriyle (Ocak, 1. çeyrek…) tutuluyordu. Takvim dönemi bazlı görünüm izleme ekranıyla gelecek.
