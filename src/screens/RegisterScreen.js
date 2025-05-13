import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import firebase from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';
import 'firebase/compat/firestore';

Icon.loadFont(); // Vector icon fontlarını yükle

const RegisterScreen = ({navigation}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);

  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const toggleSecureConfirmTextEntry = () => {
    setSecureConfirmTextEntry(!secureConfirmTextEntry);
  };

  const goToLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    try {
      // Kullanıcı oluşturma
      const userCredential = await firebase
        .auth()
        .createUserWithEmailAndPassword(email, password);

      // Kullanıcı adını ve soyadını birleştir
      const displayName = `${firstName} ${lastName}`;

      // Firebase auth profilini güncelle
      await userCredential.user.updateProfile({
        displayName: displayName,
      });

      // Firestore'a kullanıcı bilgilerini kaydetme
      await firebase
        .firestore()
        .collection('users')
        .doc(userCredential.user.uid)
        .set({
          firstName,
          lastName,
          displayName,
          email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        });

      setLoading(false);
      Alert.alert('Başarılı', 'Kayıt işlemi başarıyla tamamlandı');
      // Not: Firebase Auth Listener, kullanıcı oturum açtığında otomatik olarak Ana Sayfa'ya yönlendirecek
    } catch (error) {
      setLoading(false);
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Hata', 'Bu e-posta adresi zaten kullanılıyor');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Hata', 'Geçersiz e-posta adresi');
      } else {
        Alert.alert('Hata', 'Kayıt olurken bir hata oluştu');
        console.error(error);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.backButton} onPress={goToLogin}>
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>ROTA</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Kayıt Ol</Text>

          <View style={styles.inputContainer}>
            <Icon name="user" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Adınız"
              placeholderTextColor="#999"
              value={firstName}
              onChangeText={setFirstName}
              color="#333"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="user" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Soyadınız"
              placeholderTextColor="#999"
              value={lastName}
              onChangeText={setLastName}
              color="#333"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="envelope" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="E-posta adresinizi girin"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              color="#333"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Şifrenizi girin"
              placeholderTextColor="#999"
              secureTextEntry={secureTextEntry}
              value={password}
              onChangeText={setPassword}
              color="#333"
            />
            <TouchableOpacity onPress={toggleSecureTextEntry}>
              <Icon
                name={secureTextEntry ? 'eye' : 'eye-slash'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Şifrenizi tekrar girin"
              placeholderTextColor="#999"
              secureTextEntry={secureConfirmTextEntry}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              color="#333"
            />
            <TouchableOpacity onPress={toggleSecureConfirmTextEntry}>
              <Icon
                name={secureConfirmTextEntry ? 'eye' : 'eye-slash'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Zaten bir hesabınız var mı?</Text>
            <TouchableOpacity onPress={goToLogin}>
              <Text style={styles.loginLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginTop: 10,
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1E90FF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
    marginRight: 5,
  },
  loginLink: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
