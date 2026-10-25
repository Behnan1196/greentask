'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { OGE_DURUMU } from '@/lib/plan/durum';
import type { OgeDurumu } from '@/lib/veri/tipler';
import { ogeGuncelle, surumuIsle, yuklemeBaslat } from '../eylemler';

type Asama = { tur: 'bos' } | { tur: 'calisiyor'; metin: string } | { tur: 'hata'; metin: string } | { tur: 'tamam'; metin: string };

/** Word dosyasını doğrudan depoya yükler, ardından sunucuda taratır. */
export function PlanYukleyici({ planId }: { planId: string }) {
  const router = useRouter();
  const girdi = useRef<HTMLInputElement>(null);
  const [asama, setAsama] = useState<Asama>({ tur: 'bos' });

  async function yukle(dosya: File) {
    setAsama({ tur: 'calisiyor', metin: 'Yükleme hazırlanıyor…' });
    const b = await yuklemeBaslat(planId, dosya.name, dosya.size);
    if ('hata' in b) return setAsama({ tur: 'hata', metin: b.hata ?? 'Yükleme başlatılamadı' });
    setAsama({ tur: 'calisiyor', metin: `Yükleniyor (${(dosya.size / 1048576).toFixed(1)} MB)…` });
    try {
      const r = await fetch(b.hedef.url, {
        method: b.hedef.yontem,
        body: dosya,
        headers: { 'content-type': dosya.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'x-upsert': 'false' },
      });
      if (!r.ok) throw new Error(`${r.status}`);
    } catch (e) {
      return setAsama({ tur: 'hata', metin: `Dosya yüklenemedi (${e instanceof Error ? e.message : 'ağ hatası'}). Bağlantınızı kontrol edip yeniden deneyin.` });
    }
    setAsama({ tur: 'calisiyor', metin: 'Belge taranıyor…' });
    const s = await surumuIsle(planId, b.yol, dosya.name, dosya.size);
    if ('hata' in s) return setAsama({ tur: 'hata', metin: s.hata ?? 'Dosya işlenemedi' });
    setAsama({ tur: 'tamam', metin: `${s.oge} öğe çıkarıldı, ${s.bulgu} bulgu.` });
    if (girdi.current) girdi.current.value = '';
    router.push(`/planlar/${planId}?sekme=tarama`);
    router.refresh();
  }

  const calisiyor = asama.tur === 'calisiyor';
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Word dosyası (.docx)</span>
        <input
          ref={girdi}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={calisiyor}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void yukle(f);
          }}
          className="text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-yesil file:px-4 file:font-semibold file:text-white"
        />
      </label>
      <p role="status" aria-live="polite" className={`text-sm ${asama.tur === 'hata' ? 'text-kirmizi' : 'text-murekkep-2'}`}>
        {asama.tur === 'bos' ? 'Dosya seçince yüklenir ve taranır. Önceki sürümler silinmez.' : asama.metin}
      </p>
    </div>
  );
}

/** Harita satırındaki durum seçimi: değişince kaydedilir. Not alanı odaktan çıkınca kaydedilir. */
export function OgeFormu({ id, durum, notlar, ad }: { id: string; durum: OgeDurumu; notlar: string | null; ad: string }) {
  const form = useRef<HTMLFormElement>(null);
  const gonder = () => form.current?.requestSubmit();
  return (
    <form ref={form} action={ogeGuncelle} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select
        name="durum"
        defaultValue={durum}
        onChange={gonder}
        aria-label={`${ad} durumu`}
        className={`min-h-9 rounded-md border-0 px-2 text-xs font-semibold ${OGE_DURUMU[durum].sinif}`}
      >
        {Object.entries(OGE_DURUMU).map(([k, v]) => (
          <option key={k} value={k}>
            {v.ad}
          </option>
        ))}
      </select>
      <input
        name="notlar"
        defaultValue={notlar ?? ''}
        placeholder="Not"
        aria-label={`${ad} notu`}
        onBlur={(e) => {
          if (e.target.value !== (notlar ?? '')) gonder();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            gonder();
          }
        }}
        className="min-h-9 min-w-0 flex-1 rounded-md border border-[#c9cec6] bg-white px-2 text-sm"
      />
    </form>
  );
}
