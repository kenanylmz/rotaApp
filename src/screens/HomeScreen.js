import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import firebase from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';
import 'firebase/compat/firestore';

const HomeScreen = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
      // Firestore'dan kullanıcı bilgilerini çekme
      const unsubscribe = firebase
        .firestore()
        .collection('users')
        .doc(currentUser.uid)
        .onSnapshot(
          documentSnapshot => {
            if (documentSnapshot.exists) {
              setUserData(documentSnapshot.data());
            } else {
              setUserData({
                firstName: '',
                lastName: '',
                email: currentUser.email,
              });
            }
            setLoading(false);
          },
          error => {
            console.error('Kullanıcı bilgileri alınamadı:', error);
            setLoading(false);
          },
        );

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>ROTA</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>
          Hoş Geldiniz,{' '}
          <Text style={styles.userName}>
            {userData
              ? `${userData.firstName} ${userData.lastName}`
              : 'Kullanıcı'}
          </Text>
        </Text>

        <View style={styles.infoContainer}>
          <View style={styles.profileImageContainer}>
            <Icon name="user-circle" size={100} color="#1E90FF" />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.emailLabel}>E-posta Adresi:</Text>
            <Text style={styles.emailText}>
              {firebase.auth().currentUser
                ? firebase.auth().currentUser.email
                : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon
            name="sign-out"
            size={20}
            color="white"
            style={styles.logoutIcon}
          />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  userName: {
    fontWeight: 'bold',
    color: '#1E90FF',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  profileImageContainer: {
    marginBottom: 20,
  },
  profileInfo: {
    width: '100%',
  },
  emailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
