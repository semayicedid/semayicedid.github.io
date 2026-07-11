# Yurt Yoklama Sistemi

Yurtlarda her gün yapılan kağıt üzerindeki oda yoklamasını dijitalleştiren, tamamen istemci taraflı (frontend-only) çalışan statik bir web uygulaması. GitHub Pages gibi statik hosting ortamlarında herhangi bir sunucu/backend gerektirmeden çalışır.

## 🎯 Proje Amacı

Yurt yönetiminde her gün "kim yurtta, kim dışarıda" bilgisini kağıt üzerinde tutmak yerine; **kat → oda → öğrenci** hiyerarşisi kurulup, günlük yoklama tek tıkla alınabilir ve sonuçlar **Excel (.xlsx)** dosyası olarak bilgisayara indirilebilir.

## ✅ Tamamlanan Özellikler

### 1. Kat / Oda / Öğrenci Yönetimi (`Kat / Oda / Öğrenci` sekmesi)
- Kat ekleme, düzenleme, silme (kat silinince bağlı odalar ve öğrenciler de silinir — onay istenir)
- Her kata oda ekleme: oda numarası + kapasite bilgisi
- Kapasitesi dolan odalara öğrenci eklenmek istendiğinde uyarı verilir
- Her odaya öğrenci (isim) ekleme, düzenleme, silme
- Tüm listeler kat adı / oda no / öğrenci adına göre otomatik sıralanır

### 2. Günlük Yoklama (`Günlük Yoklama` sekmesi — ana sayfa)
- Tarih seçimi (varsayılan: bugün)
- Kata göre filtreleme, isim/oda numarasına göre arama
- Her öğrenci için **"Yurtta" / "Dışarıda"** butonu ile tek tıkla işaretleme
- "Hepsi Yurtta" / "Hepsi Dışarıda" toplu işaretleme butonları
- Anlık özet kartları: Toplam öğrenci, Yurtta, Dışarıda, Tarih
- **Kaydet** butonu ile o günün yoklaması saklanır
- **Yazdır** butonu ile yoklama listesi yazıcıdan çıktı alınabilir
- **Excel İndir** butonu ile o güne ait yoklama `.xlsx` olarak indirilir

### 3. Geçmiş Kayıtlar (`Geçmiş Kayıtlar` sekmesi)
- Daha önce kaydedilmiş tüm tarihler listelenir
- Seçilen tarihin detaylı yoklama tablosu ve özet istatistikleri görüntülenir
- Seçilen tek bir tarihi veya **tüm geçmiş kayıtları** (her tarih ayrı sayfa + özet sayfası olacak şekilde) Excel'e aktarma

### 4. Veri Yedekleme (`Veri Yedekleme` sekmesi)
- Tüm verileri (`.json`) yedek dosyası olarak indirme
- Yedek dosyasından geri yükleme
- Tüm verileri sıfırlama (çift onay ile)

## 🗂️ Fonksiyonel Sayfa/Sekme Yapısı

Tek sayfa uygulaması olduğu için tüm özellikler `index.html` üzerinde sekmeler (tab) halinde sunulur, adres çubuğunda ek parametre kullanılmaz:

| Sekme | İçerik |
|---|---|
| `#tab-attendance` (Günlük Yoklama) | Günlük yoklama alma, kaydetme, yazdırma, Excel indirme |
| `#tab-manage` (Kat / Oda / Öğrenci) | Kat, oda, öğrenci CRUD işlemleri |
| `#tab-history` (Geçmiş Kayıtlar) | Geçmiş tarihli yoklamaları görüntüleme ve dışa aktarma |
| `#tab-data` (Veri Yedekleme) | JSON yedek alma/geri yükleme, verileri sıfırlama |

## 💾 Veri Modeli ve Saklama

Bu proje **RESTful Table API / sunucu veritabanı kullanmaz**. Tüm veriler tarayıcının `localStorage`'ında saklanır (kalıcıdır, ama sadece o tarayıcı/cihaz için geçerlidir). Bu nedenle GitHub Pages gibi tamamen statik ortamlarda sorunsuz çalışır.

localStorage anahtarları ve veri yapıları:

```js
yurt_floors     -> [{ id, name }]
yurt_rooms      -> [{ id, floorId, number, capacity }]
yurt_students   -> [{ id, roomId, name }]
yurt_attendance -> {
  "YYYY-MM-DD": {
    "<studentId>": "present" | "absent"
  }
}
```

- Bir öğrenci için o gün hiç işaretleme yapılmamışsa varsayılan durum **"present" (Yurtta)** kabul edilir.
- Excel'e aktarımda sütunlar: `Tarih, Kat, Oda No, Öğrenci Adı, Durum`.

## 🧰 Kullanılan Teknolojiler

- HTML5 / CSS3 / Vanilla JavaScript (framework yok)
- [Tailwind CSS](https://tailwindcss.com/) (CDN) — stil
- [Font Awesome 6](https://fontawesome.com/) (CDN) — ikonlar
- [Google Fonts – Inter](https://fonts.google.com/specimen/Inter) — yazı tipi
- [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs) (CDN) — Excel (.xlsx) dosyası oluşturma

## 📁 Dosya Yapısı

```
index.html        Ana sayfa (tüm sekmeler)
css/style.css      Özel stiller (Tailwind'i tamamlayan sınıflar)
js/app.js          Tüm uygulama mantığı (state, CRUD, yoklama, Excel export)
README.md          Bu dosya
```

## 🚧 Henüz Uygulanmayan / Geliştirilebilecek Özellikler

- **Çoklu cihaz senkronizasyonu**: Şu an veriler sadece tarayıcı bazlı (localStorage) saklandığı için farklı bilgisayar/tarayıcıdan erişimde veriler paylaşılmaz. Bu, verilerin bir sunucu veritabanında (örn. RESTful Table API) tutulmasıyla çözülebilir.
- **Kullanıcı girişi / yetkilendirme**: Şu an herkes tüm verilere erişip düzenleyebilir; oda sorumlusu/yönetici rolleri yoktur.
- **Öğrenci fotoğrafı, TC/okul no gibi ek alanlar**.
- **Aylık/haftalık devamsızlık raporu ve grafikler** (Chart.js ile eklenebilir).
- **Toplu öğrenci içe aktarma** (Excel/CSV'den öğrenci listesi yükleme).
- **Bildirim/e-posta**: Belirli bir öğrenci art arda "dışarıda" işaretlenirse uyarı gönderme (statik sitede bu, sunucu tarafı gerektirdiğinden desteklenmez).

## 🔜 Önerilen Sonraki Adımlar

1. Kalıcı ve çok kullanıcılı veri isteniyorsa, localStorage yerine RESTful Table API tabanlı bir veri katmanına geçiş.
2. Rapor/istatistik sekmesi eklenerek öğrenci bazlı devamsızlık geçmişi ve grafiksel özetler sunulması.
3. Yurt yönetimi için basit bir giriş ekranı (herkese açık olmaması isteniyorsa Publish sonrası erişim kuralları ile desteklenebilir).

## 🌐 Yayınlama

Bu proje tamamen statik dosyalardan oluştuğu için GitHub Pages, Netlify, Vercel gibi herhangi bir statik hosting'de veya bu platformun **Publish** sekmesi üzerinden doğrudan yayınlanabilir. Ekstra sunucu/backend kurulumu gerekmez.
