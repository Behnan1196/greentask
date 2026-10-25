# Otomatik mevzuat taraması

Zamanlanmış bir Claude görevi her sabah Resmî Gazete özetlerini okur ve Greentask'ın sektör gruplarını ilgilendiren
mevzuatı uygulamaya **öneri** olarak yazar. Öneriler Mevzuat → Değişiklik takibi'nde "Onay bekleyen öneriler" altında görünür.
Ekip doğrulayıp "Takibe al" ya da "İlgisiz" der. Görev açma her zaman insan kararıdır.

## Güvenlik
- Görev uygulamaya oturumla değil, **tarama anahtarı** ile bağlanır (`Authorization: Bearer gtm_…`).
- Anahtar veritabanında yalnızca sha256 özetiyle saklanır, oluşturulurken bir kez gösterilir.
- Anahtar yalnızca iki şey yapabilir: tarama bağlamını okumak (sektör grupları, kütüphane adları, son 60 kayıt) ve öneri eklemek.
  Tesis, kişi, görev verisine erişemez; kayıt silemez ya da değiştiremez.
- Anahtar sızarsa Mevzuat → Otomatik tarama → "İptal et" ile hemen kapatılır, yenisi oluşturulup görev güncellenir.

## Uç
`GET  /api/mevzuat/tarama` → `{ son_tarama, gruplar[], kutuphane[], son_kayitlar[] }`
`POST /api/mevzuat/tarama` → gövde `{ "kayitlar": [ … ] }` (en çok 50), yanıt `{ eklenen, gelen }`.
Aynı ad + RG bilgisiyle ikinci kez gelen kayıt (reddedilenler dahil) eklenmez.

Kayıt alanları: `ad` (zorunlu), `tur`, `rg_metin` ("gg.aa.yyyy / sayı"), `ozet`, `etkilenen_gruplar` ("G1,G5"),
`etkilenen_tesisler` ("GT-001, GT-020"), `aksiyon`, `kaynak_url`, `tarama_notu` (neden ilgili bulundu).

## Kaynak
resmigazete.gov.tr otomatik erişime (robots.txt) kapalı; görev bu siteyi taramaz. Günlük "Resmî Gazete'de bugün"
özetlerini yayımlayan haber/mevzuat siteleri (ör. foreks.com, bloomberght.com, alomaliye.com çevre mevzuatı) web aramasıyla bulunur.
Bu nedenle öneri **ikincil kaynaktır**: takibe almadan önce Resmî Gazete'den teyit edilmelidir.
