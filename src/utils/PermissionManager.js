import {Platform, PermissionsAndroid, Alert} from 'react-native';

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
        Alert.alert(
          'İzin Gerekli',
          'Profil fotoğrafınızı yükleyebilmek için kamera ve galeri izinleri gereklidir.',
          [{text: 'Tamam', style: 'default'}],
        );
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
        Alert.alert(
          'İzin Gerekli',
          'Profil fotoğrafınızı yükleyebilmek için kamera ve galeri izinleri gereklidir.',
          [{text: 'Tamam', style: 'default'}],
        );
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error('İzin isteme hatası:', error);
    return false;
  }
};

export default {
  requestMediaPermissions,
};
