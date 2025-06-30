# RotaApp 📍

**RotaApp**, kullanıcıların gezdiği yerleri harita üzerinde işaretleyebildiği, fotoğraflarla anılar oluşturebildiği ve diğer kullanıcılarla bu anıları paylaşabildiği sosyal bir konum paylaşım uygulamasıdır.

## 🚀 Proje Hakkında

RotaApp, [React Native](https://reactnative.dev) kullanılarak geliştirilmiş bir mobil uygulamadır. Kullanıcılar uygulama sayesinde:

### ✨ Ana Özellikler

- **🗺️ İnteraktif Harita**: Leaflet maps kullanarak gezdiğiniz yerleri harita üzerinde işaretleyebilirsiniz
- **📸 Fotoğraf Paylaşımı**: Anılarınızı fotoğraflarla zenginleştirebilirsiniz
- **🔍 Keşfet**: Diğer kullanıcıların paylaştığı yerleri keşfedebilirsiniz
- **❤️ Sosyal Özellikler**: Paylaşımları beğenebilir ve yorum yapabilirsiniz
- **📚 Anılarım**: Kişisel gezilerinizi ve anılarınızı organize edebilirsiniz
- **👤 Profil Yönetimi**: Kişisel bilgilerinizi ve paylaşımlarınızı yönetebilirsiniz
- **🔐 Güvenli Giriş**: Firebase Authentication ile güvenli kullanıcı yönetimi

### 🛠️ Kullanılan Teknolojiler

- **Frontend**: React Native 0.78.2
- **Navigasyon**: React Navigation v7
- **Backend**: Firebase (Authentication, Firestore)
- **Harita**: Leaflet Maps (WebView ile entegre)
- **Yerel Depolama**: AsyncStorage
- **Fotoğraf**: React Native Image Picker
- **İkonlar**: React Native Vector Icons
- **İzinler**: React Native Permissions

## 📋 Gereksinimler

Projeyi çalıştırmadan önce aşağıdaki gereksinimleri karşıladığınızdan emin olun:

- **Node.js**: >= 18.x
- **React Native CLI**: Kurulu olmalı
- **Android Studio**: Android geliştirme için
- **Xcode**: iOS geliştirme için (sadece macOS)
- **Firebase Projesi**: Aktif bir Firebase projesi

## 🚀 Kurulum

### 1. Depoyu Klonlayın

```bash
git clone <repository-url>
cd rotaApp
```

### 2. Bağımlılıkları Yükleyin

```bash
# NPM kullanarak
npm install

# Yarn kullanarak
yarn install
```

### 3. iOS Bağımlılıkları (Sadece macOS)

```bash
# CocoaPods kurulumu
bundle install

# Pod bağımlılıklarını yükle
cd ios && bundle exec pod install && cd ..
```

### 4. Firebase Konfigürasyonu

#### Android için:

1. Firebase Console'dan `google-services.json` dosyasını indirin
2. `android/app/` klasörüne yerleştirin

#### iOS için:

1. Firebase Console'dan `GoogleService-Info.plist` dosyasını indirin
2. Xcode'da `ios/rotaApp/` klasörüne ekleyin

### 5. İzinler Konfigürasyonu

#### Android (android/app/src/main/AndroidManifest.xml):

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

#### iOS (ios/rotaApp/Info.plist):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Bu uygulama konumunuzu harita üzerinde göstermek için konum izni gerektirir.</string>
<key>NSCameraUsageDescription</key>
<string>Anılarınız için fotoğraf çekmek üzere kamera iznine ihtiyacımız var.</string>
```

## 🎯 Çalıştırma

### Metro Server'ı Başlatın

```bash
# NPM
npm start

# Yarn
yarn start
```

### Android'de Çalıştırma

```bash
# NPM
npm run android

# Yarn
yarn android
```

### iOS'ta Çalıştırma

```bash
# NPM
npm run ios

# Yarn
yarn ios
```

## 📱 Uygulama Yapısı

```
src/
├── components/         # Yeniden kullanılabilir bileşenler
├── config/            # Firebase ve diğer yapılandırmalar
├── navigation/        # Navigasyon yapısı
├── screens/           # Uygulama ekranları
│   ├── SplashScreen.js
│   ├── OnBoardingScreen.js
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── MapScreen.js
│   ├── ExploreScreen.js
│   ├── TripsScreen.js
│   └── ProfileScreen.js
├── styles/            # Stil dosyaları
├── utils/             # Yardımcı fonksiyonlar
└── assets/            # Resimler ve statik dosyalar
```

## 🔧 Geliştirme

### Kod Standartları

Proje ESLint ve Prettier kullanmaktadır:

```bash
# Kod kontrolü
npm run lint

# Kod formatı düzeltme
npx prettier --write .
```

### Test

```bash
npm test
```

## 🐛 Sorun Giderme

### Yaygın Sorunlar

1. **Metro bundler hatası**: `npx react-native start --reset-cache`
2. **Android build hatası**: `cd android && ./gradlew clean && cd ..`
3. **iOS build hatası**: `cd ios && rm -rf Pods && bundle exec pod install && cd ..`
4. **Firebase bağlantı sorunu**: Konfigürasyon dosyalarının doğru konumda olduğundan emin olun

### İzin Sorunları

Eğer konum veya kamera izinleri çalışmıyorsa:

- Cihaz ayarlarından uygulamaya manuel izin verin
- Uygulamayı yeniden başlatın
