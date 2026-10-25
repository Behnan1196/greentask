'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const AZAMI_KENAR = 1600;

/** Fotoğrafı tarayıcıda en uzun kenarı 1600 px olacak şekilde JPEG'e küçültür (telefon fotoğrafı ~4 MB → ~400 KB). */
async function kucult(dosya: File): Promise<Blob> {
  if (!dosya.type.startsWith('image/')) return dosya;
  const bitmap = await createImageBitmap(dosya);
  const oran = Math.min(1, AZAMI_KENAR / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * oran);
  canvas.height = Math.round(bitmap.height * oran);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((ok, hata) => canvas.toBlob((b) => (b ? ok(b) : hata(new Error('Görüntü işlenemedi'))), 'image/jpeg', 0.82));
}

async function gonder(ziyaretId: string, veri: Blob, ad: string, aciklama: string) {
  const form = new FormData();
  form.set('ziyaret_id', ziyaretId);
  form.set('aciklama', aciklama);
  form.set('dosya', veri, ad);
  const r = await fetch('/api/saha/yukle', { method: 'POST', body: form });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.hata ?? `Yükleme başarısız (${r.status})`);
}

export function SahaYukleyici({ ziyaretId }: { ziyaretId: string }) {
  const router = useRouter();
  const [aciklama, setAciklama] = useState('');
  const [durum, setDurum] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kayit, setKayit] = useState<{ kaydedici: MediaRecorder; baslangic: number } | null>(null);
  const parcalar = useRef<Blob[]>([]);

  async function dosyalariYukle(liste: FileList | null) {
    if (!liste?.length) return;
    setHata(null);
    try {
      const dosyalar = Array.from(liste);
      for (const [i, d] of dosyalar.entries()) {
        setDurum(`Yükleniyor ${i + 1}/${dosyalar.length}…`);
        const veri = await kucult(d);
        await gonder(ziyaretId, veri, d.type.startsWith('image/') ? 'foto.jpg' : d.name, aciklama);
      }
      setAciklama('');
      router.refresh();
    } catch (e) {
      setHata(e instanceof Error ? e.message : String(e));
    } finally {
      setDurum(null);
    }
  }

  async function kayitBaslat() {
    setHata(null);
    try {
      const akis = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tur = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t));
      const kaydedici = new MediaRecorder(akis, tur ? { mimeType: tur } : undefined);
      parcalar.current = [];
      kaydedici.ondataavailable = (e) => e.data.size && parcalar.current.push(e.data);
      kaydedici.onstop = async () => {
        akis.getTracks().forEach((t) => t.stop());
        const blob = new Blob(parcalar.current, { type: kaydedici.mimeType.split(';')[0] });
        setDurum('Ses kaydı yükleniyor…');
        try {
          await gonder(ziyaretId, blob, 'ses', aciklama);
          setAciklama('');
          router.refresh();
        } catch (e) {
          setHata(e instanceof Error ? e.message : String(e));
        } finally {
          setDurum(null);
        }
      };
      kaydedici.start();
      setKayit({ kaydedici, baslangic: Date.now() });
    } catch {
      setHata('Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin ya da aşağıdan ses dosyası seçin.');
    }
  }

  function kayitBitir() {
    kayit?.kaydedici.stop();
    setKayit(null);
  }

  const buton = 'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-semibold';
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Açıklama (bir sonraki fotoğraf / kayıt için)
        <input
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Örn. Tehlikeli atık deposu — etiketsiz varil"
          className="min-h-11 rounded-lg border border-[#c9cec6] bg-white px-3 text-base"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <label className={`${buton} bg-yesil text-white hover:bg-yesil-koyu`}>
          Fotoğraf çek / seç
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => {
              dosyalariYukle(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {kayit ? (
          <button type="button" onClick={kayitBitir} className={`${buton} bg-kirmizi text-white`}>
            Kaydı bitir ve yükle
          </button>
        ) : (
          <button type="button" onClick={kayitBaslat} className={`${buton} border border-[#c9cec6] bg-white`}>
            Sesli not kaydet
          </button>
        )}
      </div>
      <label className="text-xs text-soluk">
        Ya da ses / PDF dosyası seçin:{' '}
        <input
          type="file"
          accept="audio/*,application/pdf"
          className="text-xs"
          onChange={(e) => {
            dosyalariYukle(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {kayit && <p className="text-sm font-semibold text-kirmizi">● Kayıt sürüyor…</p>}
      {durum && <p className="text-sm text-murekkep-2">{durum}</p>}
      {hata && (
        <p role="alert" className="text-sm text-kirmizi">
          {hata}
        </p>
      )}
    </div>
  );
}

export function YazdirButonu({ etiket = 'Yazdır' }: { etiket?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-10 rounded-lg border border-[#c9cec6] bg-white px-3 text-sm print:hidden">
      {etiket}
    </button>
  );
}
