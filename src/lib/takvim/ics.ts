// iCalendar (RFC 5545) üreticisi: Outlook, Google Takvim ve iPhone abonelikleri için.
import { gunEkle, type Gun } from '@/lib/termin/tarih';

export type TakvimOlayi = {
  uid: string;
  tarih: Gun; // tüm gün olayı
  baslik: string;
  aciklama?: string;
  url?: string;
};

function kacis(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 75 oktetten uzun satırları katlar (UTF-8 karakter ortasından bölmeden). */
function katla(satir: string): string {
  const enc = new TextEncoder();
  if (enc.encode(satir).length <= 75) return satir;
  const parcalar: string[] = [];
  let mevcut = '';
  let uzunluk = 0;
  for (const ch of satir) {
    const n = enc.encode(ch).length;
    const sinir = parcalar.length ? 74 : 75; // devam satırları boşlukla başlar
    if (uzunluk + n > sinir) {
      parcalar.push(mevcut);
      mevcut = '';
      uzunluk = 0;
    }
    mevcut += ch;
    uzunluk += n;
  }
  parcalar.push(mevcut);
  return parcalar.join('\r\n ');
}

const tarihBicim = (g: Gun) => g.replace(/-/g, '');

export function icsOlustur(ad: string, olaylar: TakvimOlayi[], simdi: Date = new Date()): string {
  const damga = simdi.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const satirlar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Greentask//Is Sistemi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${kacis(ad)}`,
    'X-WR-TIMEZONE:Europe/Istanbul',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ];
  for (const o of olaylar) {
    satirlar.push(
      'BEGIN:VEVENT',
      `UID:${o.uid}`,
      `DTSTAMP:${damga}`,
      `DTSTART;VALUE=DATE:${tarihBicim(o.tarih)}`,
      `DTEND;VALUE=DATE:${tarihBicim(gunEkle(o.tarih, 1))}`,
      `SUMMARY:${kacis(o.baslik)}`,
      ...(o.aciklama ? [`DESCRIPTION:${kacis(o.aciklama)}`] : []),
      ...(o.url ? [`URL:${o.url}`] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  satirlar.push('END:VCALENDAR');
  return satirlar.map(katla).join('\r\n') + '\r\n';
}
