"""DEFRA/DESNZ 'GHG Conversion Factors for Company Reporting' düz (flat) dosyasından Kapsam 3
faktörlerini seçip src/lib/karbon/defra-<yil>.json üretir.

Kullanım: python3 -I araclar/defra-faktorleri.py <flat-format.xlsx> <cikti.json>
Seçim kuralları burada tek yerde durur; aynı dosyayla her çalıştırma aynı çıktıyı verir.
"""
import json, sys, openpyxl

GRUPLAR = {
    # Level 1 → ISO 14064-1 kategorisi / GHG Protocol Kapsam 3 kategorisi
    'WTT- fuels': ('4', 3),
    'WTT- heat and steam': ('4', 3),
    'WTT- bioenergy': ('4', 3),
    'Freighting goods': ('3', 4),
    'WTT- delivery vehs & freight': ('3', 4),
    'Business travel- air': ('3', 6),
    'Business travel- land': ('3', 6),
    'Business travel- sea': ('3', 6),
    'WTT- business travel- air': ('3', 6),
    'WTT- business travel- sea': ('3', 6),
    'WTT- pass vehs & travel- land': ('3', 6),
    'Hotel stay': ('3', 6),
    'Homeworking': ('3', 7),
    'Material use': ('4', 1),
    'Waste disposal': ('4', 5),
    'Water supply': ('4', 1),
    'Water treatment': ('4', 5),
}
ATLA_BIRIM = {'miles', 'passenger.miles', 'tonne.miles', 'million litres'}
ATLA_L2 = {'Cars (by market segment)'}

def main(kaynak, hedef):
    wb = openpyxl.load_workbook(kaynak, read_only=True)
    on = list(wb['Front page'].iter_rows(values_only=True))
    surum = next((r[2] for r in on if r[1] == 'Version:'), None)
    yil = next((r[4] for r in on if r[1] == 'Version:'), None)
    satirlar = list(wb['Factors by Category'].iter_rows(values_only=True))
    baslik = next(i for i, r in enumerate(satirlar) if r[0] == 'ID')
    cikti = []
    for r in satirlar[baslik + 1:]:
        kid, kapsam, l1, l2, l3, l4, sutun, birim, gaz, deger = r[:10]
        if not kid or l1 not in GRUPLAR or gaz != 'kg CO2e' or deger is None:
            continue
        if birim in ATLA_BIRIM or l2 in ATLA_L2:
            continue
        kat, ghgp = GRUPLAR[l1]
        cikti.append({
            'id': kid, 'grup': l1, 'l2': l2, 'l3': l3, 'l4': l4, 'sutun': sutun,
            'birim': birim, 'kgco2e': float(deger), 'iso_kategori': kat, 'ghgp_kategori': ghgp,
        })
    json.dump({'kaynak': f'UK Government GHG Conversion Factors for Company Reporting {yil} (flat file, sürüm {surum})',
               'yil': yil, 'surum': surum, 'faktorler': cikti}, open(hedef, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(cikti), 'faktör →', hedef)

if __name__ == '__main__':
    main(*sys.argv[1:3])
