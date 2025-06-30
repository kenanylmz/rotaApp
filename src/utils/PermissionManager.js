import {Platform, PermissionsAndroid, Alert, Linking} from 'react-native';

/**
 * Kamera ve galeri izinlerini isteyen yardımcı sınıf.
 * Android 13+ için özel izin isteklerini destekler.
 */
export const requestMediaPermissions = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // Android 13+ (API seviye 33+) için özel izinler
    if (Platform.Version >= 33) {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);

      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allGranted) {
        const anyDenied = Object.values(results).some(
          result => result === PermissionsAndroid.RESULTS.DENIED,
        );

        if (anyDenied) {
          const shouldRetry = await showRetryPermissionAlert(
            'Medya İzinleri',
            'Fotoğraf yükleyebilmek ve galeriden seçim yapabilmek için kamera ve medya izinleri gereklidir.',
          );

          if (shouldRetry) {
            return await requestMediaPermissions();
          }
        } else {
          // Kalıcı ret durumu
          await showSettingsPermissionAlert(
            'Medya İzinleri',
            'Kamera ve medya izinleri kalıcı olarak reddedildi. Fotoğraf yükleyebilmek için ayarlardan izin vermelisiniz.',
          );
        }
        return false;
      }

      return true;
    }
    // Android 13'ten önceki sürümler için
    else {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);

      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allGranted) {
        const anyDenied = Object.values(results).some(
          result => result === PermissionsAndroid.RESULTS.DENIED,
        );

        if (anyDenied) {
          const shouldRetry = await showRetryPermissionAlert(
            'Medya İzinleri',
            'Fotoğraf yükleyebilmek ve galeriden seçim yapabilmek için depolama ve kamera izinleri gereklidir.',
          );

          if (shouldRetry) {
            return await requestMediaPermissions();
          }
        } else {
          // Kalıcı ret durumu
          await showSettingsPermissionAlert(
            'Medya İzinleri',
            'Depolama ve kamera izinleri kalıcı olarak reddedildi. Fotoğraf yükleyebilmek için ayarlardan izin vermelisiniz.',
          );
        }
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error('İzin isteme hatası:', error);
    return false;
  }
};

/**
 * Konum izinlerini isteyen yardımcı sınıf.
 * Android sürümleri için konum izinlerini kontrol eder.
 */
export const requestLocationPermissions = async () => {
  if (Platform.OS === 'ios') {
    // iOS için konum izinleri
    // NOT: React Native Geolocation API'si iOS için izinleri otomatik olarak işler
    return true;
  }

  try {
    const fineLocationPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    const coarseLocationPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    );

    // Eğer izinler zaten verilmişse, tekrar istemeye gerek yok
    if (fineLocationPermission && coarseLocationPermission) {
      return true;
    }

    const permissions = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ];

    const results = await PermissionsAndroid.requestMultiple(permissions);

    const allGranted = Object.values(results).every(
      result => result === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (!allGranted) {
      const anyDenied = Object.values(results).some(
        result => result === PermissionsAndroid.RESULTS.DENIED,
      );

      if (anyDenied) {
        // Kullanıcı şimdilik reddetti, tekrar sorulabilir
        const shouldRetry = await showRetryPermissionAlert(
          'Konum İzni',
          'Haritada konumunuzu görebilmek ve yer işaretleyebilmek için konum izinleri gereklidir.',
        );

        if (shouldRetry) {
          return await requestLocationPermissions();
        }
      } else {
        // Kullanıcı "Bir daha sorma" seçeneğini işaretlemiş
        await showSettingsPermissionAlert(
          'Konum İzni',
          'Konum izinleri kalıcı olarak reddedildi. Haritada konumunuzu görebilmek için ayarlardan izin vermelisiniz.',
        );
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Konum izni isteme hatası:', error);
    return false;
  }
};

/**
 * Kullanıcıya izinleri tekrar denemesi için uyarı gösterir
 * @param {string} title Uyarı başlığı
 * @param {string} message Uyarı mesajı
 * @returns {Promise<boolean>} Kullanıcı tekrar denemek isterse true
 */
const showRetryPermissionAlert = (title, message) => {
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'İptal',
          onPress: () => resolve(false),
          style: 'cancel',
        },
        {
          text: 'Tekrar Dene',
          onPress: () => resolve(true),
        },
      ],
      {cancelable: false},
    );
  });
};

/**
 * Kullanıcıya izinleri ayarlardan değiştirmesi için uyarı gösterir
 * @param {string} title Uyarı başlığı
 * @param {string} message Uyarı mesajı
 */
const showSettingsPermissionAlert = (title, message) => {
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'İptal',
          onPress: () => resolve(false),
          style: 'cancel',
        },
        {
          text: 'Ayarlara Git',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
            resolve(false);
          },
        },
      ],
      {cancelable: false},
    );
  });
};

/**
 * İzinlerin durumunu kontrol eden yardımcı fonksiyon
 * @param {Array} permissions Kontrol edilecek izinler dizisi
 * @returns {Promise<boolean>} Tüm izinler verilmişse true
 */
export const checkPermissions = async permissions => {
  try {
    const results = await Promise.all(
      permissions.map(permission => PermissionsAndroid.check(permission)),
    );

    return results.every(result => result === true);
  } catch (error) {
    console.error('İzin kontrol hatası:', error);
    return false;
  }
};

export default {
  requestMediaPermissions,
  requestLocationPermissions,
  checkPermissions,
};
