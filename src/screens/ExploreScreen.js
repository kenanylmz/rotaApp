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
  TextInput,
  Modal,
  Keyboard,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {styles} from '../styles/exploreStyles';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '../config/firebase';
import Header from '../components/Header';

const {width} = Dimensions.get('window');

const ExploreScreen = ({navigation}) => {
  const [publicMarkers, setPublicMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markerImages, setMarkerImages] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [profileImages, setProfileImages] = useState({});

  // Kullanıcı bilgileri
  const currentUser = firebase.auth().currentUser;

  // Sayfa yüklendiğinde ve aktif olduğunda veri çek
  useEffect(() => {
    fetchPublicMarkers();

    // Ekran odaklandığında da veri yenileme
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPublicMarkers();
    });

    return unsubscribe;
  }, [navigation]);

  // Firebase'den diğer kullanıcıların işaretlerini al
  const fetchPublicMarkers = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setRefreshing(true);
    try {
      // Tüm kullanıcıların koleksiyonunu çek
      const usersSnapshot = await firebase
        .firestore()
        .collection('users')
        .get();

      let allMarkers = [];
      let userIds = [];

      // Her kullanıcının markerlarını çek ama şu anki kullanıcıyı hariç tut
      for (const userDoc of usersSnapshot.docs) {
        // Kullanıcı ID'sini kaydet, daha sonra profil resimlerini yüklemek için
        userIds.push(userDoc.id);

        // Şu anki kullanıcıyı atla
        if (userDoc.id === currentUser.uid) continue;

        const markersSnapshot = await firebase
          .firestore()
          .collection('users')
          .doc(userDoc.id)
          .collection('markers')
          .orderBy('createdAt', 'desc')
          .limit(5) // Her kullanıcıdan en fazla 5 marker getir
          .get();

        if (!markersSnapshot.empty) {
          const userData = userDoc.data();

          markersSnapshot.forEach(doc => {
            const markerData = doc.data();
            allMarkers.push({
              id: doc.id,
              userId: userDoc.id,
              userName: userData.displayName || 'Kullanıcı',
              ...markerData,
              // Başlangıçta hiçbiri beğenilmemiş olarak ayarla
              isLikedByCurrentUser: false,
            });
          });
        }
      }

      // Kullanıcının beğenilerini kontrol et
      if (allMarkers.length > 0) {
        for (const marker of allMarkers) {
          const likeDoc = await firebase
            .firestore()
            .collection('users')
            .doc(marker.userId)
            .collection('markers')
            .doc(marker.id)
            .collection('likes')
            .doc(currentUser.uid)
            .get();

          marker.isLikedByCurrentUser = likeDoc.exists;
        }
      }

      // Tarihe göre sırala (en yeniler en üstte)
      allMarkers.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
      });

      setPublicMarkers(allMarkers);

      // Her marker için resimleri al
      for (const marker of allMarkers) {
        await loadMarkerImage(marker.userId, marker.id);
      }

      // Her kullanıcının profil resmini yükle
      for (const userId of userIds) {
        await loadProfileImage(userId);
      }
    } catch (error) {
      console.error('Public marker getirme hatası:', error);
      Alert.alert('Hata', 'Keşfet ekranı yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Her kullanıcı için profil resmini AsyncStorage'dan yükle
  const loadProfileImage = async userId => {
    try {
      // Önce kayıtlı olup olmadığını kontrol et
      const profilePhotoKey = `user_profile_${userId}`;
      const cachedImage = await AsyncStorage.getItem(profilePhotoKey);

      if (cachedImage) {
        setProfileImages(prev => ({
          ...prev,
          [userId]: cachedImage,
        }));
        return;
      }

      // Eğer bu kullanıcı şu anki kullanıcıysa, kendi profil resmini kullan
      if (userId === currentUser.uid) {
        const myProfilePhoto = await AsyncStorage.getItem(
          `user_profile_${currentUser.uid}`,
        );
        if (myProfilePhoto) {
          setProfileImages(prev => ({
            ...prev,
            [userId]: myProfilePhoto,
          }));
        }
      } else {
        // Kullanıcı ID'sine göre tutarlı bir resim seçelim
        // Şimdilik her kullanıcı için sabit bir avatar kullanacağız (gerçek bir uygulamada Firebase Storage kullanılır)

        // Kullanıcı ID'sinden sayısal bir değer üretelim (tutarlı olması için)
        const userIdSum = userId
          .split('')
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);

        // Varsayılan renk için kullanıcı ID'sine göre tutarlı bir renk seçelim
        const avatarColors = [
          '#1E90FF',
          '#FF6347',
          '#32CD32',
          '#FFD700',
          '#9932CC',
          '#FF4500',
        ];
        const colorIndex = userIdSum % avatarColors.length;

        // Bu kullanıcı için bir profil fotoğrafı olmadığını bildirmeyi tercih edelim
        // Ancak daha sonra avatar rengi olarak tutarlı bir renk kullanacağız
        setProfileImages(prev => ({
          ...prev,
          [userId]: null, // Resim yok, avatar kullanılacak
        }));
      }
    } catch (error) {
      console.error(`${userId} için profil resmi yükleme hatası:`, error);
    }
  };

  // Her marker için AsyncStorage'dan resmi al
  const loadMarkerImage = async (userId, markerId) => {
    try {
      // Önce kayıtlı olup olmadığını kontrol et
      const localCacheKey = `explore_image_${userId}_${markerId}`;
      const cachedImage = await AsyncStorage.getItem(localCacheKey);

      if (cachedImage) {
        setMarkerImages(prev => ({
          ...prev,
          [`${userId}_${markerId}`]: cachedImage,
        }));
        return;
      }

      // Kullanıcı kendi marker'ını görüntülüyorsa
      if (userId === currentUser.uid) {
        const myMarkerImageKey = `marker_images_${markerId}`;
        const savedImages = await AsyncStorage.getItem(myMarkerImageKey);

        if (savedImages) {
          const parsedImages = JSON.parse(savedImages);
          if (parsedImages.length > 0) {
            const imageUri = parsedImages[0].uri;

            // Marker resmini güncelle
            setMarkerImages(prev => ({
              ...prev,
              [`${userId}_${markerId}`]: imageUri,
            }));

            // Keşfet sayfası için önbelleğe al
            await AsyncStorage.setItem(localCacheKey, imageUri);
            return;
          }
        }
      } else {
        // Diğer kullanıcıların marker resimlerini görebilmek için
        // Her marker için tutarlı bir seçim yapalım

        // Marker ID ve User ID kombine ederek tutarlı bir sayı üretelim
        const combinedId = userId + markerId;
        const idSum = combinedId
          .split('')
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);

        // Mevcut marker resimlerini alalım
        const allKeys = await AsyncStorage.getAllKeys();
        const markerImageKeys = allKeys.filter(key =>
          key.startsWith('marker_images_'),
        );

        if (markerImageKeys.length > 0) {
          // Tutarlı olması için kullanıcı+marker ID'sine göre sabit bir indeks seçiyoruz
          const selectedIndex = idSum % markerImageKeys.length;
          const selectedMarkerKey = markerImageKeys[selectedIndex];

          // Seçilen marker anahtarından resmi alıyoruz
          const savedImages = await AsyncStorage.getItem(selectedMarkerKey);

          if (savedImages) {
            const parsedImages = JSON.parse(savedImages);
            if (parsedImages.length > 0) {
              // Resimler içinden tutarlı bir tane seçelim (yine ID toplamına göre)
              const imageIndex = idSum % parsedImages.length;
              const imageUri = parsedImages[imageIndex].uri;

              // Seçilen resmi kaydet ve önbelleğe al
              setMarkerImages(prev => ({
                ...prev,
                [`${userId}_${markerId}`]: imageUri,
              }));

              await AsyncStorage.setItem(localCacheKey, imageUri);

              // Ayrıca bu resmin hangi kullanıcı ve marker'a ait olduğunu kaydedelim
              // Bu şekilde daha sonra bu resmin kime ait olduğunu bilebiliriz
              await AsyncStorage.setItem(
                `image_owner_${imageUri.replace(/[^a-zA-Z0-9]/g, '_')}`,
                JSON.stringify({
                  userId: userId,
                  markerId: markerId,
                  timestamp: new Date().toISOString(),
                }),
              );

              return;
            }
          }
        }
      }

      // Eğer hiçbir resim bulunamazsa varsayılan null kullan
      setMarkerImages(prev => ({
        ...prev,
        [`${userId}_${markerId}`]: null,
      }));
    } catch (error) {
      console.error(`${markerId} için resim yükleme hatası:`, error);
    }
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
  const handleLike = async (userId, markerId, currentLikeStatus) => {
    try {
      const markerRef = firebase
        .firestore()
        .collection('users')
        .doc(userId)
        .collection('markers')
        .doc(markerId);

      const likeRef = markerRef.collection('likes').doc(currentUser.uid);

      const likeData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Kullanıcı',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (currentLikeStatus) {
        // Beğeniyi kaldır
        await likeRef.delete();
        await markerRef.update({
          likeCount: firebase.firestore.FieldValue.increment(-1),
        });
      } else {
        // Beğeni ekle
        await likeRef.set(likeData);
        await markerRef.update({
          likeCount: firebase.firestore.FieldValue.increment(1),
        });
      }

      // Yerel veriyi güncelle
      setPublicMarkers(
        publicMarkers.map(marker =>
          marker.id === markerId && marker.userId === userId
            ? {
                ...marker,
                isLikedByCurrentUser: !currentLikeStatus,
                likeCount:
                  (marker.likeCount || 0) + (currentLikeStatus ? -1 : 1),
              }
            : marker,
        ),
      );

      // Eğer şu anda seçili marker varsa ve yorumlar modalı açıksa, seçili marker'ı da güncelle
      if (
        selectedMarker &&
        selectedMarker.id === markerId &&
        selectedMarker.userId === userId
      ) {
        setSelectedMarker({
          ...selectedMarker,
          isLikedByCurrentUser: !currentLikeStatus,
          likeCount:
            (selectedMarker.likeCount || 0) + (currentLikeStatus ? -1 : 1),
        });
      }
    } catch (error) {
      console.error('Beğeni hatası:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir sorun oluştu.');
    }
  };

  // Yorumları getir ve detay modalını aç
  const openDetailModal = async marker => {
    setSelectedMarker(marker);
    setCommentModalVisible(true);
    setLoadingComments(true);

    try {
      // Marker için yorumları getir
      const commentsSnapshot = await firebase
        .firestore()
        .collection('users')
        .doc(marker.userId)
        .collection('markers')
        .doc(marker.id)
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .get();

      const commentsData = [];
      commentsSnapshot.forEach(doc => {
        commentsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setComments(commentsData);
    } catch (error) {
      console.error('Yorumları getirme hatası:', error);
      Alert.alert('Hata', 'Yorumlar yüklenirken bir sorun oluştu.');
    } finally {
      setLoadingComments(false);
    }
  };

  // Yorum gönder
  const submitComment = async () => {
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    Keyboard.dismiss();

    try {
      if (!selectedMarker) return;

      const commentData = {
        text: newComment.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Kullanıcı',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Yorumu hedef kullanıcının marker'ına ekle
      const commentRef = await firebase
        .firestore()
        .collection('users')
        .doc(selectedMarker.userId)
        .collection('markers')
        .doc(selectedMarker.id)
        .collection('comments')
        .add(commentData);

      // Yorum sayısını güncelle
      await firebase
        .firestore()
        .collection('users')
        .doc(selectedMarker.userId)
        .collection('markers')
        .doc(selectedMarker.id)
        .update({
          commentCount: firebase.firestore.FieldValue.increment(1),
        });

      // Yerel yorumlar listesini güncelle
      setComments([
        {
          id: commentRef.id,
          ...commentData,
          createdAt: new Date(),
        },
        ...comments,
      ]);

      // Yerel anılar listesini güncelle
      setPublicMarkers(
        publicMarkers.map(marker =>
          marker.id === selectedMarker.id &&
          marker.userId === selectedMarker.userId
            ? {
                ...marker,
                commentCount: (marker.commentCount || 0) + 1,
              }
            : marker,
        ),
      );

      // Seçili marker'ı güncelle
      setSelectedMarker({
        ...selectedMarker,
        commentCount: (selectedMarker.commentCount || 0) + 1,
      });

      // Yorum inputunu temizle
      setNewComment('');
    } catch (error) {
      console.error('Yorum ekleme hatası:', error);
      Alert.alert('Hata', 'Yorumunuz eklenirken bir hata oluştu.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Yenile fonksiyonu
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPublicMarkers();
  };

  // Yorum render fonksiyonu
  const renderComment = (comment, index) => {
    // Tarih formatlaması
    const commentDate = comment.createdAt
      ? comment.createdAt.toDate
        ? comment.createdAt.toDate()
        : new Date(comment.createdAt)
      : new Date();

    const formattedDate = commentDate.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Kullanıcı profil fotoğrafını kontrol et
    const hasProfileImage =
      profileImages[comment.authorId] !== undefined &&
      profileImages[comment.authorId] !== null;

    return (
      <View key={comment.id || index} style={styles.commentItem}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAuthor}>
            {hasProfileImage ? (
              <Image
                source={{uri: profileImages[comment.authorId]}}
                style={styles.commentAvatarImage}
              />
            ) : (
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>
                  {comment.authorName
                    ? comment.authorName.charAt(0).toUpperCase()
                    : 'K'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.commentAuthorName}>
                {comment.authorName || 'Kullanıcı'}
              </Text>
              <Text style={styles.commentDate}>{formattedDate}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    );
  };

  // Marker kartı render fonksiyonu
  const renderMarkerItem = ({item}) => {
    const hasImage =
      markerImages[`${item.userId}_${item.id}`] !== undefined &&
      markerImages[`${item.userId}_${item.id}`] !== null;
    const formattedDate = item.createdAt
      ? formatDate(item.createdAt)
      : 'Yeni Eklendi';
    const hasProfileImage =
      profileImages[item.userId] !== undefined &&
      profileImages[item.userId] !== null;

    return (
      <View style={styles.markerCard}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.authorSection}>
              {hasProfileImage ? (
                <Image
                  source={{uri: profileImages[item.userId]}}
                  style={styles.authorAvatarImage}
                />
              ) : (
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorAvatarText}>
                    {item.userName
                      ? item.userName.charAt(0).toUpperCase()
                      : 'K'}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.authorName}>
                  {item.userName || 'Kullanıcı'}
                </Text>
                <Text style={styles.cardDate}>{formattedDate}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => openDetailModal(item)}>
            <View style={styles.cardImageContainer}>
              {hasImage && markerImages[`${item.userId}_${item.id}`] ? (
                <Image
                  source={{uri: markerImages[`${item.userId}_${item.id}`]}}
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
                onPress={() =>
                  handleLike(item.userId, item.id, item.isLikedByCurrentUser)
                }>
                <Icon
                  name={item.isLikedByCurrentUser ? 'heart' : 'heart-o'}
                  size={22}
                  color={item.isLikedByCurrentUser ? '#FF4C54' : '#333'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openDetailModal(item)}>
                <Icon name="comment-o" size={22} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardBody}>
            {item.likeCount > 0 && (
              <Text style={styles.likeCount}>{item.likeCount} beğeni</Text>
            )}

            <View style={styles.captionContainer}>
              <Text style={styles.authorNameCaption}>
                {item.userName || 'Kullanıcı'}
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
                onPress={() => openDetailModal(item)}>
                <Text style={styles.commentLinkText}>
                  {item.commentCount} yorumun tümünü gör
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => openDetailModal(item)}>
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
      <Header title="Keşfet" />

      <View style={styles.contentContainer}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E90FF" />
            <Text style={styles.loadingText}>Keşfet içeriği yükleniyor...</Text>
          </View>
        ) : publicMarkers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../assets/images/empty-trips.png')}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Henüz keşfedecek bir anı yok</Text>
            <Text style={styles.emptyText}>
              Diğer kullanıcıların anıları burada görünecek.
        </Text>
          </View>
        ) : (
          <>
      

            <FlatList
              removeClippedSubviews={true}
              data={publicMarkers}
              renderItem={renderMarkerItem}
              keyExtractor={item => `${item.userId}_${item.id}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              maxToRenderPerBatch={4}
              windowSize={3}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          </>
        )}
      </View>

      {/* Detay ve Yorum Modalı - modernize edilmiş */}
      <Modal
        visible={commentModalVisible}
        transparent={false}
        animationType="slide"
        statusBarTranslucent={false}
        onRequestClose={() => {
          setCommentModalVisible(false);
          setNewComment('');
          setComments([]);
        }}>
        <SafeAreaView style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            {selectedMarker && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      setCommentModalVisible(false);
                      setComments([]);
                    }}>
                    <Icon name="arrow-left" size={20} color="#333" />
                  </TouchableOpacity>

                  <View style={styles.authorSection}>
                    {profileImages[selectedMarker.userId] &&
                    profileImages[selectedMarker.userId] !== null ? (
                      <Image
                        source={{uri: profileImages[selectedMarker.userId]}}
                        style={styles.authorAvatarImage}
                      />
                    ) : (
                      <View style={styles.authorAvatar}>
                        <Text style={styles.authorAvatarText}>
                          {selectedMarker.userName
                            ? selectedMarker.userName.charAt(0).toUpperCase()
                            : 'K'}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.authorName}>
                        {selectedMarker.userName || 'Kullanıcı'}
                      </Text>
                      <Text style={styles.cardDate}>
                        {selectedMarker.createdAt
                          ? formatDate(selectedMarker.createdAt)
                          : 'Yeni Eklendi'}
                      </Text>
                    </View>
                  </View>
                </View>

                <ScrollView
                  style={styles.modalBodyScroll}
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={false}>
                  <View style={styles.modalImageContainer}>
                    {markerImages[
                      `${selectedMarker.userId}_${selectedMarker.id}`
                    ] ? (
                      <Image
                        source={{
                          uri: markerImages[
                            `${selectedMarker.userId}_${selectedMarker.id}`
                          ],
                        }}
                        style={styles.modalImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <ImageBackground
                        source={require('../assets/images/map-placeholder.jpg')}
                        style={styles.modalImage}
                        imageStyle={styles.modalImageBackground}>
                        <View style={styles.noImageOverlay}>
                          <Icon name="map-marker" size={50} color="#fff" />
                          <Text style={styles.noImageText}>Fotoğraf Yok</Text>
                        </View>
                      </ImageBackground>
                    )}
                  </View>

                  <View style={styles.modalInteractionSection}>
                    <View style={styles.modalActionButtons}>
                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() =>
                          handleLike(
                            selectedMarker.userId,
                            selectedMarker.id,
                            selectedMarker.isLikedByCurrentUser,
                          )
                        }>
                        <Icon
                          name={
                            selectedMarker.isLikedByCurrentUser
                              ? 'heart'
                              : 'heart-o'
                          }
                          size={26}
                          color={
                            selectedMarker.isLikedByCurrentUser
                              ? '#FF4C54'
                              : '#333'
                          }
                        />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.modalActionButton}>
                        <Icon name="comment-o" size={26} color="#333" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.modalBody}>
                    {selectedMarker.likeCount > 0 && (
                      <Text style={styles.modalLikeCount}>
                        {selectedMarker.likeCount} beğeni
                      </Text>
                    )}

                    <View style={styles.modalCaptionContainer}>
                      <Text style={styles.modalAuthorName}>
                        {selectedMarker.userName || 'Kullanıcı'}
                      </Text>
                      <Text style={styles.modalTitle}>
                        {selectedMarker.title || 'İsimsiz Anı'}
                      </Text>
                    </View>

                    <Text style={styles.modalDescription}>
                      {selectedMarker.description ||
                        'Bu anı için henüz bir açıklama eklenmemiş.'}
                    </Text>

                    <View style={styles.commentsHeader}>
                      <Text style={styles.commentsTitle}>
                        Yorumlar{' '}
                        {selectedMarker.commentCount
                          ? `(${selectedMarker.commentCount})`
                          : ''}
                      </Text>
                    </View>

                    {loadingComments ? (
                      <ActivityIndicator
                        size="small"
                        color="#1E90FF"
                        style={styles.commentsLoading}
                      />
                    ) : comments.length > 0 ? (
                      <View style={styles.commentsList}>
                        {comments.map((comment, index) =>
                          renderComment(comment, index),
                        )}
                      </View>
                    ) : (
                      <Text style={styles.noCommentsText}>
                        Henüz yorum yapılmamış. İlk yorumu sen yap!
                      </Text>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.modalCommentInputContainer}>
                  <TextInput
                    style={styles.modalCommentInput}
                    placeholder="Yorumunuzu yazın..."
                    placeholderTextColor="#999"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.modalCommentButton,
                      (!newComment.trim() || submittingComment) &&
                        styles.disabledButton,
                    ]}
                    disabled={!newComment.trim() || submittingComment}
                    onPress={submitComment}>
                    {submittingComment ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Icon name="send" size={16} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default ExploreScreen;
