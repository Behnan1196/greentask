import { describe, expect, it } from 'vitest';
import { icsOlustur } from './ics';

describe('ics', () => {
  const ics = icsOlustur(
    'Greentask · Ece',
    [{ uid: 'a@greentask', tarih: '2026-12-31', baslik: 'GT-004 Samsun Avdan-Maraş · MSS: Yenileme, acil; kontrol', aciklama: 'satır 1\nsatır 2' }],
    new Date('2026-10-25T10:00:00Z'),
  );

  it('tüm gün olayı, ertesi gün bitiş (yıl dönümü dahil)', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
    expect(ics).toContain('DTSTAMP:20261025T100000Z');
  });

  it('virgül, noktalı virgül ve satır sonu kaçışlanır', () => {
    const acik = ics.replace(/\r\n /g, '');
    expect(acik).toContain('Yenileme\\, acil\\; kontrol');
    expect(acik).toContain('DESCRIPTION:satır 1\\nsatır 2');
  });

  it('satırlar CRLF ile ayrılır ve 75 oktet sınırında katlanır', () => {
    const satirlar = ics.split('\r\n');
    for (const s of satirlar) expect(new TextEncoder().encode(s).length).toBeLessThanOrEqual(75);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});
