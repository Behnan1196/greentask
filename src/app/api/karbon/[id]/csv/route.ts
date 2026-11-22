import { NextResponse } from 'next/server';
import { ISO_KATEGORI_ADI } from '@/lib/karbon/adlar';
import { KAYNAKLAR } from '@/lib/karbon/kaynaklar';
import { envanterPaketi } from '@/lib/karbon/yukle';
import { oturumuDogrula } from '@/lib/veri/depo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Excel'in Türkçe ayarlarıyla doğrudan açılan CSV: noktalı virgül ayraç, virgül ondalık, UTF-8 BOM.
const hucre = (x: unknown) => {
  const v = typeof x === 'number' ? x.toLocaleString('tr-TR', { useGrouping: false, maximumFractionDigits: 6 }) : String(x ?? '');
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export async function GET(_: Request, ctx: RouteContext<'/api/karbon/[id]/csv'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new NextResponse(null, { status: 404 });
  const p = await envanterPaketi(depo, id);
  if (!p) return new NextResponse(null, { status: 404 });
  const { env, sonuc: s, faaliyetler, tesis } = p;
  const kayit = new Map(faaliyetler.map((f) => [f.id, f]));
  const satirlar: unknown[][] = [
    ['Envanter', env.baslik],
    ['Kuruluş', tesis?.resmi_unvan ?? tesis?.kisa_ad ?? ''],
    ['Yıl', env.yil],
    ['KÜP seti', s.ayarlar.gwp],
    ['Durum', env.durum === 'kilitli' ? 'Kilitli' : 'Taslak'],
    ['Motor sürümü', s.motor],
    [],
    ['Kategori', 'kg CO2e', 'Belirsizlik (%95, oran)'],
    ...Object.entries(ISO_KATEGORI_ADI).map(([k, ad]) => [ad, s.kategori[k as keyof typeof s.kategori], s.belirsizlik.kategori[k as keyof typeof s.kategori]]),
    ['Toplam', s.toplam, s.belirsizlik.toplam],
    ['Kapsam 1', s.kapsam[1]],
    ['Kapsam 2 (konum esaslı)', s.kapsam[2]],
    ['Kapsam 2 (piyasa esaslı)', s.kapsam2_piyasa],
    ['Kapsam 3', s.kapsam[3]],
    ['Biyojenik CO2 (toplam dışı)', s.biyojenik_co2],
    [],
    ['Satır', 'Açıklama', 'Kalem', 'ISO kategori', 'Kapsam', 'GHGP K3 kategori', 'CO2 kg', 'CH4 kg', 'N2O kg', 'kg CO2e', 'Belirsizlik', 'Veri kalitesi', 'Kanıt', 'Hesap adımları', 'Kaynaklar'],
    ...s.satirlar.map((r, i) => {
      const f = kayit.get(r.kaynak_id);
      return [
        i + 1,
        (f?.veri as { aciklama?: string } | undefined)?.aciklama ?? '',
        r.baslik,
        r.iso_kategori,
        r.kapsam,
        r.ghgp_kategori ?? '',
        r.gazlar.CO2,
        r.gazlar.CH4,
        r.gazlar.N2O,
        r.co2e,
        r.belirsizlik,
        f?.veri.veri_kalitesi ?? 'türetilmiş',
        f?.kanit ?? '',
        r.izler.join(' | '),
        r.kaynaklar.map((k) => KAYNAKLAR[k].ad).join(' | '),
      ];
    }),
  ];
  const govde = '﻿' + satirlar.map((r) => r.map(hucre).join(';')).join('\r\n');
  const ad = `karbon-envanteri-${tesis?.gt_kod ?? ''}-${env.yil}.csv`;
  return new NextResponse(govde, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(ad)}` },
  });
}
