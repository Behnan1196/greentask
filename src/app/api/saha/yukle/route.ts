import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { oturumuDogrula } from '@/lib/veri/depo';

// Sahadan dosya yükleme (fotoğraf, ses kaydı, belge). Fotoğraflar tarayıcıda küçültülüp gelir.
// Vercel istek sınırı ~4,5 MB olduğu için tek dosya 4 MB ile sınırlı.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AZAMI = 4 * 1024 * 1024;
const TURLER: Record<string, { tur: 'foto' | 'ses' | 'belge'; uzanti: string }> = {
  'image/jpeg': { tur: 'foto', uzanti: 'jpg' },
  'image/png': { tur: 'foto', uzanti: 'png' },
  'image/webp': { tur: 'foto', uzanti: 'webp' },
  'audio/webm': { tur: 'ses', uzanti: 'webm' },
  'audio/ogg': { tur: 'ses', uzanti: 'ogg' },
  'audio/mp4': { tur: 'ses', uzanti: 'm4a' },
  'audio/mpeg': { tur: 'ses', uzanti: 'mp3' },
  'audio/x-m4a': { tur: 'ses', uzanti: 'm4a' },
  'application/pdf': { tur: 'belge', uzanti: 'pdf' },
};

export async function POST(request: Request) {
  const { depo } = await oturumuDogrula();
  const form = await request.formData();
  const ziyaretId = String(form.get('ziyaret_id') ?? '');
  const dosya = form.get('dosya');
  if (!UUID.test(ziyaretId) || !(dosya instanceof File)) {
    return NextResponse.json({ hata: 'Geçersiz istek' }, { status: 400 });
  }
  const mime = dosya.type.split(';')[0];
  const t = TURLER[mime];
  if (!t) return NextResponse.json({ hata: `Desteklenmeyen dosya türü: ${dosya.type || 'bilinmiyor'}` }, { status: 415 });
  if (dosya.size > AZAMI) return NextResponse.json({ hata: 'Dosya 4 MB sınırını aşıyor' }, { status: 413 });
  if (!(await depo.ziyaret(ziyaretId))) return NextResponse.json({ hata: 'Ziyaret bulunamadı' }, { status: 404 });

  const zaman = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const yol = `${ziyaretId}/${zaman}_${crypto.randomUUID().slice(0, 8)}.${t.uzanti}`;
  await depo.dosyaKaydet(
    { ziyaret_id: ziyaretId, tur: t.tur, yol, mime, boyut: dosya.size, aciklama: String(form.get('aciklama') ?? '').trim() || null },
    await dosya.arrayBuffer(),
  );
  revalidatePath(`/saha/${ziyaretId}`);
  return NextResponse.json({ tamam: true });
}
