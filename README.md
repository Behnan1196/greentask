# Greentask İş Sistemi

Greentask Enerji Danışmanlık'ın tesis, termin ve mevzuat takibini Excel'den alıp tek bir veritabanına taşıyan web uygulaması.
**Sürüm 0.1 (pilot):** Kokpit, tesis listesi, tesis kartı (yükümlülük tarihleri ve geçmişin düzenlenmesi) ve kural motoru.

- **Arayüz:** Next.js 16 (App Router, Server Actions), Tailwind 4
- **Veri ve kimlik doğrulama:** Supabase (Postgres + Auth). Yetkiler satır düzeyi güvenlikle (RLS) veritabanında tanımlı.
- **Termin hesabı:** `src/lib/termin`. Saf TypeScript, testli. Excel'deki 15 sekmenin formülleri altı kural tipine indirildi.

## Klasör yapısı

```
supabase/migrations/   Veritabanı şeması (tablolar, RLS, tetikleyiciler)
supabase/seed.sql      Excel'den üretilen veri (depoya GİRMEZ: müşteri iletişim bilgisi içerir)
scripts/excel_aktar.py Excel → seed.sql dönüştürücü + veri sorunları raporu
src/lib/termin/        Kural motoru, kural kataloğu (katalog.json), testler
src/lib/veri/          Veri erişim katmanı (Supabase; geliştirme için yerel Postgres demo)
src/app/(uygulama)/    Ekranlar: Kokpit, Tesisler, Tesis kartı
docs/                  Kural kataloğu, veri modeli, Excel'de bulunan sorunlar
```

## Kurulum (ilk kez)

### 1. Supabase projesi
1. https://supabase.com üzerinde yeni bir proje açın (bölge: Frankfurt `eu-central-1`, İstanbul'a en yakını).
2. **Authentication → Sign In / Providers → Email:** "Allow new users to sign up" seçeneğini **kapatın**. Kullanıcıları yalnızca yönetici davet edecek.
3. **Project Settings → API** sayfasından *Project URL* ve *Publishable key* değerlerini alın.

### 2. Şema ve veri
```bash
npm install
python3 -m pip install openpyxl                     # ilk kez
npm run aktar -- "../GT_Sistem_MEVZUAT_2026-10-12.xlsx"   # supabase/seed.sql + aktarım raporu üretir
npx supabase login
npx supabase link --project-ref <proje-ref>          # ref: proje URL'sindeki kod
npx supabase db push --include-seed                  # şemayı kurar, veriyi yükler
```
`seed.sql` idempotenttir: Excel güncellenip yeniden çalıştırılırsa kayıtlar güncellenir, mükerrer kayıt oluşmaz.
*Not: Sisteme veri girişi başladıktan sonra Excel'den yeniden aktarım yapmayın. Excel'deki eski tarih, sistemde güncellenmiş tarihin üzerine yazar.*

### 3. Kullanıcılar
Önce bir kez, e-posta bağlantılarını uygulamaya yönlendirin:
- **Authentication → URL Configuration → Site URL:** uygulamanın adresi (şimdilik `http://localhost:3000`, büro bilgisayarına geçince onun adresi).
- **Authentication → Emails → Templates:** *Invite user* ve *Reset password* şablonlarındaki bağlantıyı (`{{ .ConfirmationURL }}`) şununla değiştirin:
  - Invite: `{{ .SiteURL }}/auth/onay?token_hash={{ .TokenHash }}&type=invite`
  - Reset password: `{{ .SiteURL }}/auth/onay?token_hash={{ .TokenHash }}&type=recovery`

Sonra:
1. Supabase → **Authentication → Users → Invite user** ile her çalışanı e-postasıyla davet edin. Bağlantıya tıklayan kişi şifre belirleme sayfasına gelir.
   Daveti kaybeden ya da şifresini unutan kişi giriş ekranındaki "Şifremi unuttum" ile yeni bağlantı ister.
2. İlk kullanıcıyı yönetici yapın (Supabase → SQL Editor):
   ```sql
   update public.profiller set rol = 'yonetici', ad_soyad = 'Ad Soyad' where eposta = 'kisi@ornek.com';
   ```
   Yönetici kural kataloğunu ve kullanıcı rollerini değiştirebilir. Mühendisler tesis verisini okuyup yazabilir.
   Ayrılan bir çalışanın erişimini kapatmak için: `update public.profiller set aktif = false where eposta = '…';`

### 4. Çalıştırma
`.env.example` dosyasını `.env.local` adıyla kopyalayıp Supabase değerlerini girin, sonra:
```bash
npm run dev        # http://localhost:3000
```
Büro bilgisayarında sürekli açık kullanım için: `npm run build && npm run start`.

## Yayına alma (Vercel)
1. https://vercel.com → **Add New → Project** → GitHub'daki `greentask` deposunu seçin. Framework otomatik "Next.js" gelir; başka ayar gerekmez.
2. **Environment Variables** bölümüne `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değerlerini girip **Deploy** deyin.
   (`GT_DEMO_DB_URL` Vercel'e girilmez; demo modu production'da zaten kapalı.)
3. Supabase → **Authentication → URL Configuration**:
   - **Site URL:** Vercel adresi, örn. `https://greentask.vercel.app`
   - **Redirect URLs:** aynı adres + `http://localhost:3000/**` (yerel geliştirme için)
4. Sunucu bölgesi `vercel.json` ile Frankfurt'a (`fra1`) sabit; Supabase projesi de Frankfurt'taysa sorgular aynı bölgede kalır.

Bundan sonra `main` dalına her `git push` otomatik yayına alınır; diğer dallar ayrı önizleme adresi alır.

**E-posta:** Supabase'in yerleşik e-posta servisi yalnızca proje ekibindeki adreslere ve saatte birkaç e-posta gönderir.
Çalışanlara davet gidebilmesi için **Project Settings → Authentication → SMTP Settings** ile kendi SMTP'nizi tanımlayın
(örn. Resend, Brevo ya da şirket e-postası).

## Güncellemeleri yayına alma
Yeni bir sürümde `supabase/migrations/` altına yeni dosya geldiyse **önce veritabanını, sonra kodu** güncelleyin:
```bash
npx supabase db push      # yeni migration'ları uygular (seed'i yeniden yüklemez)
git push                  # Vercel yeni kodu yayına alır
```
Sıra tersine olursa yeni kod, henüz var olmayan sütunları sorgulayıp hata verir.

## İşletme planları
Word dosyası (.docx) tarayıcıdan doğrudan Supabase Storage'daki özel `planlar` kovasına yüklenir (Vercel'in 4,5 MB istek sınırına takılmaz), sonra sunucuda taranır.
Supabase'in **Storage → Settings → Global file size limit** değeri plan dosyalarından büyük olmalı (ücretsiz planda en çok 50 MB; 13 MB'lık planlar sorunsuz).
Tarama yalnızca biçimsel ve hesapsal hataları bulur: dizin–metin uyumsuzluğu, numara atlaması, başlık stilinde olmayan başlıklar, mükerrer tablo/şekil başlıkları,
firma unvanının farklı yazılışları, iki yıldan eski veri tabloları, sık yazım hataları ve "a x b x c = d" biçimindeki hesaplar. Kurallar: `src/lib/plan/tarama.ts`.

## Supabase'siz deneme (demo modu)
Yerel bir Postgres'e şema ve veri yüklenip `.env.local` içine `GT_DEMO_DB_URL=postgresql://…` yazılırsa uygulama oturum açmadan o veritabanıyla çalışır.
Bu mod yalnızca geliştirme içindir; production derlemesinde devre dışıdır.
Yerel veritabanı için önce `tests/db/supabase_stub.sql`, sonra migration, sonra `seed.sql` çalıştırılır.

## Testler
```bash
npm test           # kural motoru (13'ü Excel KOKPİT 16.07.2026 değerleriyle birebir), takvim, saha, plan taraması
npm run typecheck
npm run lint
```

## Kural motoru nasıl çalışır
Her yükümlülük türü bir **kural tipi** ve **parametrelerle** tanımlıdır (`src/lib/termin/katalog.json`, veritabanında `yukumluluk_turleri`).
Tesis bazındaki kayıt yalnızca girdileri tutar: bitiş tarihi, son işlem tarihi, sözleşme tarihi ve olaylar (yapıldı, sunuldu, eksiklik geldi…).
Kalan gün ve durum her açılışta yeniden hesaplanır; Excel'deki gibi formül kopyalama ya da elle güncellenen bir özet yoktur.
Tesise özel istisnalar (örn. "EAYP 3 ay önce sunulur") kaydın `parametreler` alanıyla türün varsayılanını ezer.
Ayrıntılar: [docs/KURAL_KATALOGU.md](docs/KURAL_KATALOGU.md).

## Yol haritası
- [x] Şema, RLS, Excel aktarımı, kural motoru, Kokpit, Tesis kartı
- [x] Benim İşlerim: tesis/yükümlülük sorumlusu, elle görev, kişisel takvim aboneliği (.ics)
- [x] Toplantı & Görevler: gündem (devreden görevler + sistemin işaretledikleri), kararlar → görev, tutanak (.md), görev panosu
- [ ] Müşteri hatırlatma e-postaları (onaylı gönderim)
- [ ] Belge tasnifi (büro bilgisayarında klasör tarayıcı → Supabase'e özet)
- [x] Mevzuat: değişiklik takibi (etkilenen tesisler gruptan/koddan çözülür, tesis başına görev), kütüphane ve sektör grubu matrisi, tesis kartında uygulanan mevzuat
- [ ] Mevzuat: Resmî Gazete taramasının sonuçlarını doğrudan "Değişiklik takibi"ne yazması
- [x] Saha ziyaretleri: otomatik hazırlık listesi, fotoğraf (tarayıcıda küçültülür) / sesli not / PDF yükleme, bulgular → görev, yazdırılabilir rapor
- [x] İşletme planı: Word sürümleri, plan haritası (bölüm/tablo/şekil, durum ve notlar sürümler arasında korunur), hata taraması (dizin, numaralandırma, mükerrer başlık, firma unvanı, eski veri, yazım, hesap), revizyon maddeleri → görev
- [ ] İşletme planı: veri tablolarını izleme kayıtlarından üretme, sıfırdan plan şablonu
