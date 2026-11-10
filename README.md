# Okul Zili – PWA sürümü

Bu proje telefona kurulabilir Progressive Web App (PWA) olacak şekilde düzenlenmiştir. Mevcut React/Vite arayüzü, Express API'si, Firebase entegrasyonu ve Gemini komut ayrıştırıcısı korunmuştur.

## Telefona kurulum

1. Projeyi HTTPS destekleyen bir sunucuya dağıtın. PWA kurulumu için HTTPS gerekir (localhost geliştirme ortamında istisnadır).
2. Sunucuda `npm install` ve ardından `npm run build` komutlarını çalıştırın.
3. Gemini özellikleri için `.env.example` dosyasını `.env` olarak kopyalayıp `GEMINI_API_KEY` değerini girin. API anahtarını istemci koduna koymayın.
4. Uygulamayı `NODE_ENV=production npm start` ile çalıştırın.
5. Telefonda uygulamanın HTTPS adresini Chrome ile açın. Tarayıcıdaki **Yükle / Ana ekrana ekle** seçeneğini kullanın. Uygun cihazlarda uygulama içi yükleme bildirimi de görünür.

## PWA özellikleri

- Web App Manifest ve 192/512 px uygulama simgeleri
- Android için maskable simge
- Service Worker ile uygulama kabuğu ve statik dosya önbelleği
- Ağ kesintisinde önbelleğe alınmış uygulama kabuğunu açma
- Android tarayıcılarında uygulama yükleme istemi
- Uygulama API istekleri (`/api/`) önbelleğe alınmaz

## Geliştirme

```bash
npm install
cp .env.example .env
npm run dev
```

Not: İlk açılışta ve güncel verilerin alınmasında internet gerekir. Gemini ve Firebase gibi sunucu/harici servis özellikleri çevrimdışı çalışmaz. Bu ortamda bağımlılık kurulumu zaman aşımına uğradığı için üretim derlemesi doğrulanamadı; dağıtımdan önce `npm install`, `npm run build` ve gerçek HTTPS adresinde telefon testi yapılmalıdır.
