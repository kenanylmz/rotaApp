import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '../config/firebase';
import Header from '../components/Header';

const {width} = Dimensions.get('window');

const TripsScreen = ({navigation}) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markerImages, setMarkerImages] = useState({});

  const user = firebase.auth().currentUser;

  // Sayfa yüklendiğinde ve aktif olduğunda veri çek
  useEffect(() => {
    fetchMarkers();

    // Ekran odaklandığında da veri yenileme
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMarkers();
    });

    return unsubscribe;
  }, [navigation]);

  // Firebase'den işaretlenmiş yerleri al
  const fetchMarkers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const markersSnapshot = await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .orderBy('createdAt', 'desc')
        .get();

      const markersData = [];
      markersSnapshot.forEach(doc => {
        markersData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setMarkers(markersData);

      // Her marker için resimleri al
      for (const marker of markersData) {
        await loadMarkerImage(marker.id);
      }
    } catch (error) {
      console.error('Marker getirme hatası:', error);
      Alert.alert('Hata', 'Anılarınız yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Her marker için AsyncStorage'dan ilk resmi al
  const loadMarkerImage = async markerId => {
    try {
      const savedImages = await AsyncStorage.getItem(
        `marker_images_${markerId}`,
      );
      if (savedImages) {
        const parsedImages = JSON.parse(savedImages);
        if (parsedImages.length > 0) {
          setMarkerImages(prev => ({
            ...prev,
            [markerId]: parsedImages[0].uri,
          }));
        }
      }
    } catch (error) {
      console.error(`${markerId} için resim yükleme hatası:`, error);
    }
  };

  // Marker detay sayfasına git
  const navigateToMarkerDetails = markerId => {
    navigation.navigate('YerDetayları', {
      markerId: markerId,
      onMarkerUpdate: fetchMarkers,
    });
  };

  // Harita sayfasına git
  const goToMap = () => {
    navigation.navigate('Harita');
  };

  // Tarih formatla
  const formatDate = timestamp => {
    if (!timestamp) return 'Tarih bilgisi yok';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Beğen işlevi
  const handleLike = async markerId => {
    try {
      const markerRef = firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .doc(markerId);

      const doc = await markerRef.get();
      const currentData = doc.data();
      const isLiked = currentData.isLiked || false;

      await markerRef.update({
        isLiked: !isLiked,
        likeCount: (currentData.likeCount || 0) + (isLiked ? -1 : 1),
      });

      // Yerel veriyi güncelle
      setMarkers(
        markers.map(marker =>
          marker.id === markerId
            ? {
                ...marker,
                isLiked: !isLiked,
                likeCount: (marker.likeCount || 0) + (isLiked ? -1 : 1),
              }
            : marker,
        ),
      );
    } catch (error) {
      console.error('Beğeni hatası:', error);
    }
  };

  // Marker kartı render fonksiyonu
  const renderMarkerItem = ({item}) => {
    const hasImage = markerImages[item.id] !== undefined;
    const formattedDate = item.createdAt
      ? formatDate(item.createdAt)
      : 'Yeni Eklendi';

    return (
      <View style={styles.markerCard}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.authorSection}>
              <View style={styles.authorAvatar}>
                <Text style={styles.authorAvatarText}>
                  {user.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : 'K'}
                </Text>
              </View>
              <View>
                <Text style={styles.authorName}>
                  {user.displayName || 'Kullanıcı'}
                </Text>
                <Text style={styles.cardDate}>{formattedDate}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.menuButton}>
              <Icon name="ellipsis-h" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => navigateToMarkerDetails(item.id)}>
            <View style={styles.cardImageContainer}>
              {hasImage ? (
                <Image
                  source={{uri: markerImages[item.id]}}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <ImageBackground
                  source={require('../assets/images/map-placeholder.jpg')}
                  style={styles.cardImage}
                  imageStyle={styles.cardImageBackground}>
                  <View style={styles.noImageOverlay}>
                    <Icon name="map-marker" size={50} color="#fff" />
                    <Text style={styles.noImageText}>Fotoğraf Yok</Text>
                  </View>
                </ImageBackground>
              )}
              <View style={styles.cardLocation}>
                <Icon name="map-marker" size={14} color="#fff" />
                <Text style={styles.cardLocationText} numberOfLines={1}>
                  {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.interactionSection}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(item.id)}>
                <Icon
                  name={item.isLiked ? 'heart' : 'heart-o'}
                  size={22}
                  color={item.isLiked ? '#FF4C54' : '#333'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigateToMarkerDetails(item.id)}>
                <Icon name="comment-o" size={22} color="#333" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Icon name="share" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.bookmarkButton}>
              <Icon name="bookmark-o" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            {item.likeCount > 0 && (
              <Text style={styles.likeCount}>{item.likeCount} beğeni</Text>
            )}

            <View style={styles.captionContainer}>
              <Text style={styles.authorNameCaption}>
                {user.displayName || 'Kullanıcı'}
              </Text>
              <Text style={styles.cardTitle}>
                {item.title || 'İsimsiz Anı'}
              </Text>
            </View>

            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description || 'Bu anı için henüz bir açıklama eklenmemiş.'}
            </Text>

            {item.commentCount > 0 && (
              <TouchableOpacity
                style={styles.commentLink}
                onPress={() => navigateToMarkerDetails(item.id)}>
                <Text style={styles.commentLinkText}>
                  {item.commentCount} yorumun tümünü gör
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => navigateToMarkerDetails(item.id)}>
              <Text style={styles.detailsButtonText}>Detayları Görüntüle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent={false}
        backgroundColor="#fff"
        barStyle="dark-content"
      />
      <Header title="Anılarım" />

      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E90FF" />
            <Text style={styles.loadingText}>Anılarınız yükleniyor...</Text>
          </View>
        ) : markers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../assets/images/empty-trips.png')}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Henüz hiç anı eklemediniz</Text>
            <Text style={styles.emptyText}>
              Harita ekranına giderek yeni yerler işaretleyebilir ve anılarınızı
              kaydedebilirsiniz.
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={goToMap}>
              <Icon name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Yeni Anı Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Anı Akışım</Text>
              <TouchableOpacity style={styles.addSmallButton} onPress={goToMap}>
                <Icon name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.addSmallButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              removeClippedSubviews={true}
              data={markers}
              renderItem={renderMarkerItem}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              maxToRenderPerBatch={4}
              windowSize={3}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: 20,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  addSmallButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  list: {
    paddingBottom: 20,
  },
  separator: {
    height: 12,
    backgroundColor: '#f8f8f8',
  },
  markerCard: {
    width: '100%',
    backgroundColor: '#fff',
  },
  cardContent: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  authorAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  cardDate: {
    fontSize: 12,
    color: '#888',
  },
  menuButton: {
    padding: 8,
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: width,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageBackground: {
    opacity: 0.9,
  },
  noImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
    fontWeight: '600',
  },
  cardLocation: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLocationText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    maxWidth: width - 80,
  },
  interactionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
    padding: 4,
  },
  bookmarkButton: {
    padding: 4,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingBottom: 15,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  captionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorNameCaption: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  commentLink: {
    marginBottom: 12,
  },
  commentLinkText: {
    fontSize: 14,
    color: '#888',
  },
  detailsButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
});

export default TripsScreen;
