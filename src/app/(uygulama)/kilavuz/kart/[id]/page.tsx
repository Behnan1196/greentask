import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IsKartiGoster } from '@/components/is-karti';
import { oturumuDogrula } from '@/lib/veri/depo';
import { isKartiKaydet, isKartiSil } from '../../eylemler';
import { ANA, IsKartiAlanlari } from '../../formlar';

export const metadata: Metadata = { title: 'İş kartı' };

export default async function GenelKart(props: PageProps<'/kilavuz/kart/[id]'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await props.params;
  const k = (await depo.isKartlari()).find((x) => x.id === id && !x.tur_id);
  if (!k) notFound();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/kilavuz" className="text-sm no-underline">
        ← Kılavuz
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{k.baslik}</h1>
      <div className="flex flex-wrap items-start gap-6">
        <section className="min-w-0 flex-[1_1_360px] rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <IsKartiGoster k={k} />
        </section>
        <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <h2 className="text-base font-semibold">Düzenle</h2>
          <form action={isKartiKaydet} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={k.id} />
            <IsKartiAlanlari k={k} />
            <button className={`${ANA} self-start`}>Kaydet</button>
          </form>
          <form action={isKartiSil} className="border-t border-cizgi pt-3">
            <input type="hidden" name="id" value={k.id} />
            <button className="text-xs text-soluk hover:text-kirmizi">Bu kartı sil</button>
          </form>
        </section>
      </div>
    </div>
  );
}
