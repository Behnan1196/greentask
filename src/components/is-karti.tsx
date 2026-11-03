import Link from 'next/link';
import type { IsKarti } from '@/lib/veri/tipler';

const satirlar = (m: string | null) => (m ?? '').split('\n').map((s) => s.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim()).filter(Boolean);

/** İş kartının okunur hâli: adımlar, istenecekler, nereye, dikkat. */
export function IsKartiGoster({ k, baglanti, kompakt = false }: { k: IsKarti; baglanti?: string; kompakt?: boolean }) {
  const adimlar = satirlar(k.yapilacaklar);
  const istenecek = satirlar(k.istenecekler);
  const baslik = kompakt ? 'text-xs font-semibold uppercase tracking-wide text-soluk' : 'text-sm font-semibold';
  return (
    <div className="flex flex-col gap-3 text-sm">
      {adimlar.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className={baslik}>Ne yapılır</h4>
          <ol className="ml-5 list-decimal text-murekkep-2">
            {adimlar.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      {istenecek.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className={baslik}>Kimden ne istenir</h4>
          <ul className="ml-5 list-disc text-murekkep-2">
            {istenecek.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {k.nereye && (
        <div className="flex flex-col gap-1">
          <h4 className={baslik}>Nereye, hangi formatta</h4>
          <p className="whitespace-pre-line text-murekkep-2">{k.nereye}</p>
        </div>
      )}
      {k.dikkat && (
        <div className="flex flex-col gap-1 rounded-lg bg-[#fbf6ee] px-3 py-2">
          <h4 className={`${baslik} text-turuncu`}>Dikkat</h4>
          <p className="whitespace-pre-line text-murekkep-2">{k.dikkat}</p>
        </div>
      )}
      {!adimlar.length && !istenecek.length && !k.nereye && !k.dikkat && <p className="text-soluk">Kart henüz doldurulmamış.</p>}
      {baglanti && (
        <Link href={baglanti} className="self-start text-xs no-underline">
          Kartı düzenle →
        </Link>
      )}
    </div>
  );
}
