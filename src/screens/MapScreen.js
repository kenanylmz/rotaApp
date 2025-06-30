import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import {WebView} from 'react-native-webview';
import Icon from 'react-native-vector-icons/FontAwesome';
import Geolocation from '@react-native-community/geolocation';
import firebase from '../config/firebase';
import 'firebase/compat/firestore';
import Header from '../components/Header';
import {requestLocationPermissions} from '../utils/PermissionManager';

const MapScreen = ({navigation}) => {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [userMarkers, setUserMarkers] = useState([]);
  const [showTip, setShowTip] = useState(true);
  const tipOpacity = useRef(new Animated.Value(1)).current;

  // Geçici işaretçi için state ve modal
  const [tempMarker, setTempMarker] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Kullanıcı bilgileri
  const user = firebase.auth().currentUser;

  // Konum izinlerini kontrol et
  useEffect(() => {
    const checkPermissions = async () => {
      const hasPermission = await requestLocationPermissions();
      if (hasPermission) {
        getCurrentLocation();
      } else {
        Alert.alert(
          'Konum İzni Gerekli',
          'Harita özelliğini kullanabilmek için konum izni vermelisiniz.',
          [
            {
              text: 'İptal',
              style: 'cancel',
            },
            {
              text: 'Ayarlara Git',
              onPress: () => {
                // Platform özgü ayarlar sayfasına yönlendirme
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ],
        );
      }
    };

    checkPermissions();
    fetchUserMarkers();

    // İpucu kartını 5 saniye sonra otomatik gizle
    const timer = setTimeout(() => {
      hideTip();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // İpucu kartını gizle animasyonu
  const hideTip = () => {
    Animated.timing(tipOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => setShowTip(false));
  };

  // Kullanıcının işaretlerini Firebase'den al
  const fetchUserMarkers = async () => {
    if (!user) return;

    try {
      const markersSnapshot = await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .get();

      const markers = [];
      markersSnapshot.forEach(doc => {
        markers.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setUserMarkers(markers);
    } catch (error) {
      console.error('Marker getirme hatası: ', error);
      Alert.alert('Hata', 'Kayıtlı yerleriniz yüklenirken bir hata oluştu.');
    }
  };

  // Native taraftan kullanıcı konumunu al
  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => {
        console.error('Konum hatası: ', error);
        Alert.alert('Konum Hatası', 'Konumunuz alınamadı.');
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  // WebView yüklendiğinde
  const onWebViewLoaded = () => {
    setLoading(false);

    // Markerleri WebView'a yükle
    if (userMarkers.length > 0) {
      const initMarkersMessage = {
        type: 'INIT_MARKERS',
        markers: userMarkers,
      };

      webViewRef.current.postMessage(JSON.stringify(initMarkersMessage));
    }
  };

  // WebView'dan gelen mesajlar
  const handleWebViewMessage = event => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case 'USER_LOCATION':
          // WebView'dan alınan konum bilgisini sakla
          setUserLocation({
            latitude: message.lat,
            longitude: message.lng,
          });
          break;

        case 'LOCATION_ERROR':
          // WebView'dan alınan konum hatası
          Alert.alert('Konum Hatası', message.message);
          break;

        case 'ADD_MARKER':
          // Artık doğrudan kaydetmek yerine, geçici markeri ayarla
          setTempMarker({
            lat: message.lat,
            lng: message.lng,
          });
          setModalVisible(true);

          // Geçici marker'ı haritada göster
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'SHOW_TEMP_MARKER',
                lat: message.lat,
                lng: message.lng,
              }),
            );
          }
          break;

        case 'SHOW_DETAILS':
          // Marker detayları sayfasına git
          navigation.navigate('YerDetayları', {
            markerId: message.markerId,
            onMarkerUpdate: fetchUserMarkers,
          });
          break;
      }
    } catch (error) {
      console.error('WebView mesaj hatası:', error);
    }
  };

  // Geçici marker'ı kaydet
  const saveTempMarker = async () => {
    if (!user) {
      Alert.alert('Hata', 'Yer işaretlemek için giriş yapmalısınız.');
      return;
    }

    if (!tempMarker) return;

    try {
      // Firestore'a yeni marker ekle
      const markerRef = await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .add({
          lat: tempMarker.lat,
          lng: tempMarker.lng,
          title: 'Yeni İşaret',
          description: '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      // Kullanıcı marker'larına ekle
      const newMarker = {
        id: markerRef.id,
        lat: tempMarker.lat,
        lng: tempMarker.lng,
        title: 'Yeni İşaret',
        description: '',
      };

      setUserMarkers(prevMarkers => [...prevMarkers, newMarker]);

      // Geçici marker'ı kapat
      setModalVisible(false);
      setTempMarker(null);

      // WebView'daki geçici marker'ı kaldır ve kalıcı ekle
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'REMOVE_TEMP_MARKER',
          }),
        );

        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'ADD_SAVED_MARKER',
            marker: newMarker,
          }),
        );
      }

      // Detay sayfasına git
      navigation.navigate('YerDetayları', {
        markerId: markerRef.id,
        isNewMarker: true,
        onMarkerUpdate: fetchUserMarkers,
      });
    } catch (error) {
      console.error('Marker ekleme hatası:', error);
      Alert.alert('Hata', 'Yer işaretlenirken bir hata oluştu.');
    }
  };

  // Geçici marker'ı iptal et
  const cancelTempMarker = () => {
    setModalVisible(false);
    setTempMarker(null);

    // WebView'daki geçici marker'ı kaldır
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'REMOVE_TEMP_MARKER',
        }),
      );
    }
  };

  // Konumu yenile
  const refreshLocation = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'GET_LOCATION',
        }),
      );
    }
  };

  // HTML dosyasının yolunu belirle
  const getMapHtmlSource = () => {
    if (Platform.OS === 'android') {
      return {uri: 'file:///android_asset/html/leaflet-map.html'};
    }
    return require('../assets/html/leaflet-map.html');
  };

  return (
    <View style={styles.container}>
      <Header title="Harita" />

      <View style={styles.mapContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E90FF" />
            <Text style={styles.loadingText}>Harita yükleniyor...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={getMapHtmlSource()}
          style={styles.webview}
          onLoad={onWebViewLoaded}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => <View style={styles.webviewLoading} />}
          geolocationEnabled={true}
        />

        {showTip && (
          <Animated.View style={[styles.tipContainer, {opacity: tipOpacity}]}>
            <View style={styles.tipIconContainer}>
              <Icon name="lightbulb-o" size={24} color="#FFC107" />
            </View>
            <View style={styles.tipTextContainer}>
              <Text style={styles.tipTitle}>Nasıl Kullanılır?</Text>
              <Text style={styles.tipText}>
                Konumunuzu veya haritada herhangi bir yeri{' '}
                <Text style={styles.boldText}>basılı tutarak</Text> anılarınıza
                ekleyebilirsiniz.
              </Text>
            </View>
            <TouchableOpacity style={styles.tipCloseButton} onPress={hideTip}>
              <Icon name="times" size={16} color="#666" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Yeni konum onay modalı */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={cancelTempMarker}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Yeni Yer İşaretlemek İstiyor musunuz?
                </Text>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalText}>
                  Bu konumu anılarınıza eklemek ve detaylarını düzenlemek için
                  onaylayın.
                </Text>

                {tempMarker && (
                  <Text style={styles.locationText}>
                    Konum: {tempMarker.lat.toFixed(6)},{' '}
                    {tempMarker.lng.toFixed(6)}
                  </Text>
                )}
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={cancelTempMarker}>
                  <Icon name="times" size={16} color="#FFFFFF" />
                  <Text style={styles.buttonText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveTempMarker}>
                  <Icon name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={refreshLocation}>
          <Icon name="location-arrow" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1E90FF',
    fontWeight: 'bold',
  },
  webviewLoading: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  floatingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  tipContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tipIconContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#1E90FF',
  },
  tipCloseButton: {
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  locationText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    fontFamily: Platform.select({ios: 'Courier', android: 'monospace'}),
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
});

export default MapScreen;
