"""Arka plan kaldırma işçisi.

Neden ayrı bir süreç? rembg modelini yüklemek ~19 saniye sürüyor. Her komut
için yeni Python başlatılsak her görselde 19 saniye beklenirdi. Bu yüzden
süreç bir kez başlatılıp model bir kez yüklenir, sonra işler stdin'den
satır satır alınır.

Protokol (tek satır, JSON):
    giden : {"goruntu": "<base64>", "model": "u2net"}
    gelen : {"tamam": true,  "goruntu": "<base64 png>"}   başarılı
            {"tamam": false, "hata": "..."}               hatalı
İlk açılışta hazır olduğunu bildiren bir satır yazar:
            {"hazir": true, "sure": 18.7}

stdout YALNIZCA bu JSON satırları için kullanılır; model yükleme sırasında
gelen uyarılar stderr'e düşer (yoksa hattan karışırdı).
"""

import base64
import io
import json
import sys
import time


def yaz(nesne):
    sys.stdout.write(json.dumps(nesne) + "\n")
    sys.stdout.flush()


def main():
    baslangic = time.time()
    try:
        from rembg import new_session, remove
    except Exception as hata:  # noqa: BLE001
        yaz({"hazir": False, "hata": f"rembg yuklenemedi: {hata}"})
        return 1

    # Oturum bir kez kurulur, tüm işlerde paylaşılır.
    oturumlar = {}

    def oturum_getir(model):
        if model not in oturumlar:
            oturumlar[model] = new_session(model)
        return oturumlar[model]

    # Varsayılan modeli şimdi yükle: ilk kullanıcı beklemesin diye.
    try:
        oturum_getir("u2net")
    except Exception as hata:  # noqa: BLE001
        yaz({"hazir": False, "hata": f"model yuklenemedi: {hata}"})
        return 1

    yaz({"hazir": True, "sure": round(time.time() - baslangic, 1)})

    for satir in sys.stdin:
        satir = satir.strip()
        if not satir:
            continue
        try:
            istek = json.loads(satir)
        except Exception:
            yaz({"tamam": False, "hata": "gecersiz istek"})
            continue

        try:
            model = istek.get("model") or "u2net"
            veri = base64.b64decode(istek["goruntu"], validate=False)
            # rembg 2.x remove() doğrudan PNG baytı döndürür (PIL Image değil),
            # bu yüzden yeniden kaydetmeye gerek yok.
            sonuc = remove(veri, session=oturum_getir(model))
            if not sonuc:
                yaz({"tamam": False, "hata": "arka plan silinemedi (bos sonuc)"})
                continue
            if isinstance(sonuc, bytes):
                bayt = sonuc
            else:  # eski sürümlerde PIL Image dönebiliyor
                tampon = io.BytesIO()
                sonuc.save(tampon, format="PNG")
                bayt = tampon.getvalue()
            yaz({"tamam": True, "goruntu": base64.b64encode(bayt).decode()})
        except Exception as hata:  # noqa: BLE001
            # Tek bir hatalı görsel işçiyi öldürmemeli.
            yaz({"tamam": False, "hata": str(hata)[:300]})

    return 0


if __name__ == "__main__":
    sys.exit(main())
