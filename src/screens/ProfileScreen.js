import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '../config/firebase';
import {requestMediaPermissions} from '../utils/PermissionManager';
import Header from '../components/Header';

Icon.loadFont(); // Vector icon fontlarını yükle

const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [securePasswordEntry, setSecurePasswordEntry] = useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);
  const [lastLogin, setLastLogin] = useState(null);

  // Kullanıcı bilgilerini ve profil fotoğrafını yükle
  useEffect(() => {
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
      setUser(currentUser);
      setDisplayName(currentUser.displayName || '');

      // Firestore'dan kullanıcı bilgilerini al
      firebase
        .firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get()
        .then(doc => {
          if (doc.exists) {
            const userData = doc.data();
            if (userData.displayName && !currentUser.displayName) {
              setDisplayName(userData.displayName);
            }
            if (userData.lastLogin) {
              setLastLogin(userData.lastLogin.toDate());
            }
          }
        })
        .catch(error => {
          console.error('Kullanıcı bilgileri alınamadı:', error);
        });

      // AsyncStorage'dan profil fotoğrafını yükle
      loadProfileImage();
    }
  }, []);

  // Profil fotoğrafını AsyncStorage'dan yükle
  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem(
        `profileImage_${firebase.auth().currentUser.uid}`,
      );
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.error('Profil fotoğrafı yüklenemedi:', error);
    }
  };

  // Profil fotoğrafını seç
  const selectProfileImage = async () => {
    // İzinleri kontrol et
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) {
      return;
    }

    const options = {
      maxWidth: 500,
      maxHeight: 500,
      mediaType: 'photo',
      includeBase64: true,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('Kullanıcı resim seçmeyi iptal etti');
      } else if (response.errorCode) {
        console.error('ImagePicker Hatası:', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const source = `data:${response.assets[0].type};base64,${response.assets[0].base64}`;
        setProfileImage(source);
        saveProfileImage(source);
      }
    });
  };

  // Profil fotoğrafını AsyncStorage'a kaydet
  const saveProfileImage = async imageUri => {
    try {
      await AsyncStorage.setItem(
        `profileImage_${firebase.auth().currentUser.uid}`,
        imageUri,
      );
    } catch (error) {
      console.error('Profil fotoğrafı kaydedilemedi:', error);
    }
  };

  // Kullanıcı bilgilerini güncelle
  const updateUserProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Hata', 'Ad Soyad alanı boş olamaz');
      return;
    }

    setLoading(true);
    try {
      const currentUser = firebase.auth().currentUser;

      // Firebase Authentication'da displayName'i güncelle
      await currentUser.updateProfile({
        displayName: displayName.trim(),
      });

      // Firestore'da kullanıcı bilgilerini güncelle
      await firebase.firestore().collection('users').doc(currentUser.uid).set(
        {
          displayName: displayName.trim(),
          email: currentUser.email,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );

      setEditMode(false);
      setUser({...currentUser, displayName: displayName.trim()});
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi');
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Şifre değiştir
  const changePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Hata', 'Yeni şifre alanı boş olamaz');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    try {
      await firebase.auth().currentUser.updatePassword(newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Başarılı', 'Şifreniz başarıyla güncellendi');
    } catch (error) {
      console.error('Şifre güncelleme hatası:', error);

      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Oturum Zaman Aşımı',
          'Bu işlemi gerçekleştirmek için yeniden giriş yapmanız gerekiyor',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Kullanıcıyı çıkış yap ve giriş sayfasına yönlendir
                handleLogout();
              },
            },
          ],
        );
      } else {
        Alert.alert('Hata', 'Şifre güncellenirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  // Çıkış yap
  const handleLogout = async () => {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  // Yükleniyor durumu
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  // Son giriş zamanını formatla
  const formatLastLogin = () => {
    if (!lastLogin) return '';

    const day = lastLogin.getDate().toString().padStart(2, '0');
    const month = (lastLogin.getMonth() + 1).toString().padStart(2, '0');
    const year = lastLogin.getFullYear();
    const hours = lastLogin.getHours().toString().padStart(2, '0');
    const minutes = lastLogin.getMinutes().toString().padStart(2, '0');
    const seconds = lastLogin.getSeconds().toString().padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <View style={styles.container}>
      <Header title="Profil" />

      {!editMode ? (
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {/* Profil Banner */}
          <View style={styles.profileBanner}>
            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={selectProfileImage}>
              {profileImage ? (
                <Image
                  source={{uri: profileImage}}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="user" size={60} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Icon name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.profileName}>
              {displayName || 'İsim Belirtilmedi'}
            </Text>
            <Text style={styles.profileEmail}>{user.email}</Text>

            <View style={styles.profileButtonsContainer}>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setEditMode(true)}>
                <Icon
                  name="edit"
                  size={16}
                  color="#FFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.profileButtonText}>Düzenle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setShowPasswordModal(true)}>
                <Icon
                  name="lock"
                  size={16}
                  color="#FFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.profileButtonText}>Şifre Değiştir</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* İstatistikler */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>İstatistikler</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon name="map" size={24} color="#1E90FF" />
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Toplam Gezi</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="heart" size={24} color="#FF3B5C" />
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Favori Yerler</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="star" size={24} color="#FFD700" />
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Değerlendirme</Text>
              </View>
            </View>
          </View>

          {/* Hesap Bilgileri */}
          <View style={styles.accountContainer}>
            <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>

            <View style={styles.accountItem}>
              <Icon
                name="envelope"
                size={20}
                color="#1E90FF"
                style={styles.accountIcon}
              />
              <Text style={styles.accountLabel}>E-posta</Text>
              <Text style={styles.accountValue}>{user ? user.email : ''}</Text>
            </View>

            <View style={styles.accountItem}>
              <Icon
                name="check-circle"
                size={20}
                color="#1E90FF"
                style={styles.accountIcon}
              />
              <Text style={styles.accountLabel}>E-posta Doğrulaması</Text>
              <Text style={[styles.accountValue, {color: '#4CD964'}]}>
                Doğrulanmış
              </Text>
            </View>

            <View style={styles.accountItem}>
              <Icon
                name="clock-o"
                size={20}
                color="#1E90FF"
                style={styles.accountIcon}
              />
              <Text style={styles.accountLabel}>Son Giriş</Text>
              <Text style={styles.accountValue}>
                {formatLastLogin() || 'Bilinmiyor'}
              </Text>
            </View>
          </View>

          {/* Popüler Yerleriniz */}
          <View style={styles.popularPlacesContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popüler Yerleriniz</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllButton}>
                  Tümünü Gör{' '}
                  <Icon name="angle-right" size={14} color="#1E90FF" />
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.noPlacesText}>
              Henüz ziyaret ettiğiniz bir yer bulunmamaktadır.
            </Text>
          </View>

          {/* Çıkış Yap */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // Düzenleme modu
        <View style={styles.editContainer}>
          <View style={styles.editProfileHeader}>
            <TouchableOpacity
              style={styles.editProfileImageContainer}
              onPress={selectProfileImage}>
              {profileImage ? (
                <Image
                  source={{uri: profileImage}}
                  style={styles.editProfileImage}
                />
              ) : (
                <View style={styles.editProfileImagePlaceholder}>
                  <Icon name="user" size={60} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.editCameraIconContainer}>
                <Icon name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.editForm}>
            <View style={styles.inputContainer}>
              <Icon
                name="user"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Ad Soyad"
                placeholderTextColor="#999"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                color="#333"
              />
            </View>

            <View style={styles.editButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setEditMode(false);
                  setDisplayName(user.displayName || '');
                }}>
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={updateUserProfile}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Şifre Değiştirme Modal'ı */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Şifre Değiştir</Text>

            <View style={styles.inputContainer}>
              <Icon
                name="lock"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Yeni Şifre"
                placeholderTextColor="#999"
                secureTextEntry={securePasswordEntry}
                value={newPassword}
                onChangeText={setNewPassword}
                color="#333"
              />
              <TouchableOpacity
                onPress={() => setSecurePasswordEntry(!securePasswordEntry)}>
                <Icon
                  name={securePasswordEntry ? 'eye' : 'eye-slash'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Icon
                name="lock"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Şifreyi Tekrarla"
                placeholderTextColor="#999"
                secureTextEntry={secureConfirmEntry}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                color="#333"
              />
              <TouchableOpacity
                onPress={() => setSecureConfirmEntry(!secureConfirmEntry)}>
                <Icon
                  name={secureConfirmEntry ? 'eye' : 'eye-slash'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}>
                <Text style={styles.cancelModalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={changePassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveModalButtonText}>Değiştir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  // Profil Banner Stili
  profileBanner: {
    backgroundColor: '#1E90FF',
    paddingVertical: -10,
    paddingBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#1E90FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 15,
    opacity: 0.9,
  },
  profileButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    width: '100%',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  buttonIcon: {
    marginRight: 5,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // İstatistikler Stili
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    paddingBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },

  // Hesap Bilgileri Stili
  accountContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 15,
    marginTop: 0,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  accountIcon: {
    marginRight: 10,
  },
  accountLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  accountValue: {
    fontSize: 16,
    color: '#666',
  },

  // Popüler Yerler Stili
  popularPlacesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 15,
    marginTop: 0,
    padding: 15,
    paddingBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllButton: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: '600',
  },
  noPlacesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Çıkış Yap Butonu
  logoutButton: {
    backgroundColor: '#FF3B30',
    margin: 15,
    marginTop: 0,
    marginBottom: Platform.OS === 'ios' ? 40 : 30,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Düzenleme Modu
  editContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  editProfileHeader: {
    backgroundColor: '#1E90FF',
    paddingVertical: 20,
    alignItems: 'center',
  },
  editProfileImageContainer: {
    position: 'relative',
  },
  editProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  editProfileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  editCameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#1E90FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  editForm: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#1E90FF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Modal Stili
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelModalButton: {
    backgroundColor: '#F0F0F0',
  },
  saveModalButton: {
    backgroundColor: '#1E90FF',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ProfileScreen;
