import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
  StatusBar,
  ImageBackground,
  Animated,
  Keyboard,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import IconMaterial from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import firebase from '../config/firebase';
import Header from '../components/Header';
import {requestMediaPermissions} from '../utils/PermissionManager';

const {width} = Dimensions.get('window');
const imageSize = (width - 50) / 2;

const PlaceDetailsScreen = ({route, navigation}) => {
  const {markerId, isNewMarker, onMarkerUpdate} = route.params || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marker, setMarker] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Yorum işlevselliği için state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const commentInputRef = useRef(null);
  const [showComments, setShowComments] = useState(false);

  // Kullanıcı bilgileri
  const user = firebase.auth().currentUser;

  // Animasyon başlat
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Marker bilgilerini yükle
  useEffect(() => {
    if (markerId) {
      fetchMarkerDetails();
      loadImages();
      fetchComments();
    } else {
      setLoading(false);
    }
  }, [markerId]);

  // Firebase'den marker detaylarını al
  const fetchMarkerDetails = async () => {
    try {
      const doc = await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .doc(markerId)
        .get();

      if (doc.exists) {
        const markerData = doc.data();
        setMarker({id: doc.id, ...markerData});
        setTitle(markerData.title || '');
        setDescription(markerData.description || '');
        setIsLiked(markerData.isLiked || false);
        setLikeCount(markerData.likeCount || 0);
      } else {
        Alert.alert('Hata', 'Yer bilgisi bulunamadı.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Marker detay hatası:', error);
      Alert.alert('Hata', 'Yer bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // AsyncStorage'dan görüntüleri yükle
  const loadImages = async () => {
    try {
      const savedImages = await AsyncStorage.getItem(
        `marker_images_${markerId}`,
      );
      if (savedImages) {
        setImages(JSON.parse(savedImages));
      }
    } catch (error) {
      console.error('Görüntüleri yükleme hatası:', error);
    }
  };

  // Firebase'den yorumları al
  const fetchComments = async () => {
    try {
      const commentsSnapshot = await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .doc(markerId)
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
      console.error('Yorum getirme hatası:', error);
    }
  };

  // Görüntüleri AsyncStorage'a kaydet
  const saveImages = async imageList => {
    try {
      await AsyncStorage.setItem(
        `marker_images_${markerId}`,
        JSON.stringify(imageList),
      );
    } catch (error) {
      console.error('Görüntüleri kaydetme hatası:', error);
    }
  };

  // Görüntü ekle
  const addImage = async () => {
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) {
      return;
    }

    const options = {
      mediaType: 'photo',
      maxWidth: 1200,
      maxHeight: 1200,
      includeBase64: true,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const newImage = {
          uri: `data:${response.assets[0].type};base64,${response.assets[0].base64}`,
          timestamp: new Date().getTime(),
        };

        const updatedImages = [...images, newImage];
        setImages(updatedImages);
        saveImages(updatedImages);
      }
    });
  };

  // Görüntüyü kaldır
  const removeImage = timestamp => {
    Alert.alert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğinize emin misiniz?',
      [
        {text: 'İptal', style: 'cancel'},
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const updatedImages = images.filter(
              img => img.timestamp !== timestamp,
            );
            setImages(updatedImages);
            saveImages(updatedImages);
          },
        },
      ],
    );
  };

  // Beğenme işlevi
  const handleLike = async () => {
    try {
      const newIsLiked = !isLiked;
      const newLikeCount = likeCount + (newIsLiked ? 1 : -1);

      setIsLiked(newIsLiked);
      setLikeCount(newLikeCount);

      await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .doc(markerId)
        .update({
          isLiked: newIsLiked,
          likeCount: newLikeCount,
        });
    } catch (error) {
      console.error('Beğeni hatası:', error);
      // Hata durumunda eski değerlere geri dön
      setIsLiked(!isLiked);
      setLikeCount(likeCount + (isLiked ? 1 : -1));
    }
  };

  // Yorum ekle
  const addComment = async () => {
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    Keyboard.dismiss();

    try {
      const commentData = {
        text: newComment.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Kullanıcı',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const commentRef = await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .doc(markerId)
        .collection('comments')
        .add(commentData);

      // Yorum sayısını güncelle
      await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .doc(markerId)
        .update({
          commentCount: firebase.firestore.FieldValue.increment(1),
        });

      // Yerel state'i güncelle
      setComments([
        {
          id: commentRef.id,
          ...commentData,
          createdAt: new Date(),
        },
        ...comments,
      ]);

      setNewComment('');
    } catch (error) {
      console.error('Yorum ekleme hatası:', error);
      Alert.alert('Hata', 'Yorumunuz eklenirken bir hata oluştu.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Yorumu sil
  const deleteComment = commentId => {
    Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğinize emin misiniz?', [
      {text: 'İptal', style: 'cancel'},
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await firebase
              .firestore()
              .collection('users')
              .doc(user.uid)
              .collection('markers')
              .doc(markerId)
              .collection('comments')
              .doc(commentId)
              .delete();

            // Yorum sayısını güncelle
            await firebase
              .firestore()
              .collection('users')
              .doc(user.uid)
              .collection('markers')
              .doc(markerId)
              .update({
                commentCount: firebase.firestore.FieldValue.increment(-1),
              });

            // Yerel state'i güncelle
            setComments(comments.filter(comment => comment.id !== commentId));
          } catch (error) {
            console.error('Yorum silme hatası:', error);
            Alert.alert('Hata', 'Yorum silinirken bir hata oluştu.');
          }
        },
      },
    ]);
  };

  // Marker'ı kaydet
  const saveMarker = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Lütfen bir başlık girin.');
      return;
    }

    setSaving(true);
    try {
      await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('markers')
        .doc(markerId)
        .update({
          title,
          description,
          isSaved: true,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      // Callback ile marker listesini güncelle
      if (onMarkerUpdate) {
        onMarkerUpdate();
      }

      Alert.alert('Başarılı', 'Yer bilgileri kaydedildi.', [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      Alert.alert('Hata', 'Yer bilgileri kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Marker'ı sil
  const deleteMarker = async () => {
    Alert.alert(
      'Yer İşaretini Sil',
      'Bu yeri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        {text: 'İptal', style: 'cancel'},
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // Firestore'dan marker'ı sil
              await firebase
                .firestore()
                .collection('users')
                .doc(user.uid)
                .collection('markers')
                .doc(markerId)
                .delete();

              // AsyncStorage'dan resimleri temizle
              try {
                await AsyncStorage.removeItem(`marker_images_${markerId}`);
              } catch (e) {
                console.error('AsyncStorage temizleme hatası:', e);
              }

              // Callback ile marker listesini güncelle
              if (onMarkerUpdate) {
                onMarkerUpdate();
              }

              Alert.alert('Başarılı', 'Yer başarıyla silindi.', [
                {
                  text: 'Tamam',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              setLoading(false);
              console.error('Silme hatası:', error);
              Alert.alert('Hata', 'Yer silinirken bir hata oluştu.');
            }
          },
        },
      ],
    );
  };

  // Görüntüleri render et
  const renderImageItem = ({item}) => (
    <View style={styles.imageItem}>
      <Image source={{uri: item.uri}} style={styles.galleryImage} />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeImage(item.timestamp)}>
        <Icon name="trash" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  // Yorumları render et
  const renderCommentItem = ({item}) => {
    // Tarih biçimlendirme
    const commentDate = item.createdAt
      ? item.createdAt.toDate
        ? item.createdAt.toDate()
        : new Date(item.createdAt)
      : new Date();

    const formattedDate = commentDate.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAuthor}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarText}>
                {item.authorName
                  ? item.authorName.charAt(0).toUpperCase()
                  : 'K'}
              </Text>
            </View>
            <View>
              <Text style={styles.commentAuthorName}>
                {item.authorName || 'Kullanıcı'}
              </Text>
              <Text style={styles.commentDate}>{formattedDate}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.commentDeleteButton}
            onPress={() => deleteComment(item.id)}>
            <Icon name="trash-o" size={14} color="#999" />
          </TouchableOpacity>
        </View>

        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    );
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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          translucent={false}
          backgroundColor="#fff"
          barStyle="dark-content"
        />
        <Header title="Anı Detayları" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <StatusBar
        translucent={false}
        backgroundColor="#fff"
        barStyle="dark-content"
      />
      <Header title="Anı Detayları" />

      <Animated.ScrollView
        style={[styles.scrollView, {opacity: fadeAnim}]}
        showsVerticalScrollIndicator={false}>
        {marker && (
          <View style={styles.headerContainer}>
            <ImageBackground
              source={
                images.length > 0
                  ? {uri: images[0].uri}
                  : require('../assets/images/map-placeholder.jpg')
              }
              style={styles.headerBackground}
              imageStyle={styles.headerBackgroundImage}>
              <View style={styles.headerOverlay} />
              <View style={styles.headerContent}>
                <View style={styles.locationBadge}>
                  <Icon name="map-marker" size={16} color="#fff" />
                  <Text style={styles.locationText}>
                    {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                  </Text>
                </View>

                <View style={styles.dateChip}>
                  <Icon name="calendar" size={12} color="#1E90FF" />
                  <Text style={styles.dateText}>
                    {marker.createdAt
                      ? formatDate(marker.createdAt)
                      : 'Yeni Anı'}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </View>
        )}

        <View style={styles.cardContainer}>
          <View style={styles.cardSection}>
            <View style={styles.sectionTitleRow}>
              <IconMaterial name="title" size={22} color="#1E90FF" />
              <Text style={styles.sectionTitle}>Anı Başlığı</Text>
            </View>
            <TextInput
              style={styles.titleInput}
              placeholder="Anınıza bir başlık verin..."
              placeholderTextColor="#aaa"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
          </View>

          <View style={styles.cardSection}>
            <View style={styles.sectionTitleRow}>
              <IconMaterial name="description" size={22} color="#1E90FF" />
              <Text style={styles.sectionTitle}>Anı Detayları</Text>
            </View>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Bu anı hakkında daha fazla detay ekleyin..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Beğeni ve yorum bölümü */}
          <View style={styles.interactionSection}>
            <TouchableOpacity
              style={[styles.interactionButton, isLiked && styles.likedButton]}
              onPress={handleLike}>
              <Icon
                name={isLiked ? 'heart' : 'heart-o'}
                size={22}
                color={isLiked ? '#FF4C54' : '#666'}
              />
              <Text
                style={[styles.interactionText, isLiked && styles.likedText]}>
                {likeCount > 0 ? `${likeCount} Beğeni` : 'Beğen'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.interactionButton}
              onPress={() => {
                setShowComments(!showComments);
                if (!showComments && commentInputRef.current) {
                  setTimeout(() => commentInputRef.current.focus(), 300);
                }
              }}>
              <Icon name="comment-o" size={20} color="#666" />
              <Text style={styles.interactionText}>
                {comments.length > 0 ? `${comments.length} Yorum` : 'Yorum Yap'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Yorumlar bölümü */}
          {showComments && (
            <View style={styles.commentsSection}>
              <View style={styles.sectionTitleRow}>
                <IconMaterial name="comment" size={22} color="#1E90FF" />
                <Text style={styles.sectionTitle}>Yorumlar</Text>
              </View>

              <View style={styles.commentInputContainer}>
                <TextInput
                  ref={commentInputRef}
                  style={styles.commentInput}
                  placeholder="Yorum yaz..."
                  placeholderTextColor="#aaa"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />

                <TouchableOpacity
                  style={[
                    styles.commentSendButton,
                    (!newComment.trim() || submittingComment) &&
                      styles.disabledButton,
                  ]}
                  disabled={!newComment.trim() || submittingComment}
                  onPress={addComment}>
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Icon name="send" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {comments.length > 0 ? (
                <FlatList
                  data={comments}
                  renderItem={renderCommentItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.commentsList}
                />
              ) : (
                <View style={styles.emptyCommentsContainer}>
                  <Text style={styles.emptyCommentsText}>
                    Henüz yorum yapılmamış. İlk yorumu sen yap!
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.cardSection}>
            <View style={styles.gallerySectionHeader}>
              <View style={styles.sectionTitleRow}>
                <IconMaterial name="photo-library" size={22} color="#1E90FF" />
                <Text style={styles.sectionTitle}>Fotoğraf Galerisi</Text>
              </View>
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={addImage}>
                <Icon name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
              </TouchableOpacity>
            </View>

            {images.length > 0 ? (
              <FlatList
                data={images}
                renderItem={renderImageItem}
                keyExtractor={item => item.timestamp.toString()}
                numColumns={2}
                contentContainerStyle={styles.galleryContainer}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyGalleryContainer}>
                <Icon
                  name="image"
                  size={40}
                  color="#ddd"
                  style={styles.emptyGalleryIcon}
                />
                <Text style={styles.emptyGalleryText}>
                  Henüz fotoğraf eklenmemiş
                </Text>
                <Text style={styles.emptyGallerySubtext}>
                  Anılarınızı daha canlı tutmak için fotoğraf ekleyin
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={saveMarker}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Kaydet</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={deleteMarker}>
              <Icon name="trash" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Sil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    height: 200,
    width: '100%',
  },
  headerBackground: {
    height: '100%',
    width: '100%',
  },
  headerBackgroundImage: {
    resizeMode: 'cover',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  locationText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-end',
  },
  dateText: {
    marginLeft: 6,
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    marginTop: -20,
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  cardSection: {
    marginTop: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  titleInput: {
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#333',
  },
  descriptionInput: {
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#333',
    minHeight: 120,
  },
  gallerySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addPhotoText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageItem: {
    width: imageSize,
    height: imageSize,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyGalleryContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    padding: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  emptyGalleryIcon: {
    marginBottom: 10,
  },
  emptyGalleryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 5,
  },
  emptyGallerySubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  interactionSection: {
    flexDirection: 'row',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 12,
  },
  interactionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  likedButton: {
    backgroundColor: 'rgba(255, 76, 84, 0.08)',
    borderRadius: 8,
  },
  interactionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  likedText: {
    color: '#FF4C54',
  },
  commentsSection: {
    marginTop: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 10,
    maxHeight: 80,
  },
  commentSendButton: {
    backgroundColor: '#1E90FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#B0C4DE',
  },
  commentsList: {
    paddingBottom: 10,
  },
  commentItem: {
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentAuthorName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#888',
  },
  commentDeleteButton: {
    padding: 5,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyCommentsText: {
    color: '#888',
    fontSize: 14,
  },
});

export default PlaceDetailsScreen;
