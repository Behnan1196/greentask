import { NextResponse } from 'next/server';
import { oturumuDogrula } from '@/lib/veri/depo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Plan sürümünü indirir. Supabase'de kısa ömürlü imzalı adrese yönlendirir (büyük dosya sunucudan geçmez).
export async function GET(_: Request, ctx: RouteContext<'/api/planlar/surum/[id]'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new NextResponse(null, { status: 404 });
  const s = await depo.planSurumu(id);
  if (!s) return new NextResponse(null, { status: 404 });
  const adres = await depo.planIndirmeAdresi(s.yol, s.dosya_adi);
  if (adres) return NextResponse.redirect(adres);
  return new NextResponse(await depo.planDosyasi(s.yol), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(s.dosya_adi)}`,
    },
  });
}
