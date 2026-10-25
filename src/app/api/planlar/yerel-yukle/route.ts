import { NextResponse } from 'next/server';
import { demoPlanDosyasiYaz } from '@/lib/veri/demo-depo';
import { demoModu, oturumuDogrula } from '@/lib/veri/depo';

// YALNIZCA DEMO: Supabase imzalı yükleme adresinin yerel karşılığı. Production'da 404 döner.
const YOL = /^[0-9a-f-]{36}\/\d{8}T\d{6}_[0-9a-f]{8}\.docx$/;

export async function PUT(request: Request) {
  if (!demoModu()) return new NextResponse(null, { status: 404 });
  await oturumuDogrula();
  const yol = new URL(request.url).searchParams.get('yol') ?? '';
  if (!YOL.test(yol)) return NextResponse.json({ hata: 'Geçersiz yol' }, { status: 400 });
  await demoPlanDosyasiYaz(yol, await request.arrayBuffer());
  return NextResponse.json({ tamam: true });
}
