import { oturumuDogrula } from '@/lib/veri/depo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Saha dosyasını oturum açmış ekip üyesine sunar (depolama kovası özel; doğrudan bağlantı yok).
export async function GET(_req: Request, ctx: RouteContext<'/api/saha/dosya/[id]'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response('Bulunamadı', { status: 404 });
  const d = await depo.dosya(id);
  if (!d) return new Response('Bulunamadı', { status: 404 });
  const veri = await depo.dosyaIcerigi(d.yol);
  return new Response(veri, {
    headers: {
      'Content-Type': d.mime,
      'Content-Length': String(veri.byteLength),
      'Cache-Control': 'private, max-age=86400, immutable',
    },
  });
}
