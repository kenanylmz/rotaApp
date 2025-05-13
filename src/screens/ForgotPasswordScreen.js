import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import firebase from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';

Icon.loadFont(); // Vector icon fontlarını yükle

const ForgotPasswordScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const goToLogin = () => {
    navigation.navigate('Login');
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin');
      return;
    }

    setLoading(true);
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      setLoading(false);
      Alert.alert(
        'Başarılı',
        'Şifre sıfırlama linki e-posta adresinize gönderildi',
        [
          {
            text: 'Tamam',
            onPress: goToLogin,
          },
        ],
      );
    } catch (error) {
      setLoading(false);
      if (error.code === 'auth/user-not-found') {
        Alert.alert(
          'Hata',
          'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı',
        );
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Hata', 'Geçersiz e-posta adresi');
      } else {
        Alert.alert('Hata', 'Şifre sıfırlama işlemi başarısız oldu');
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

        <View style={styles.formContainer}>
          <Image
            source={require('../assets/images/forgot-password.png')}
            style={styles.image}
            resizeMode="contain"
          />

          <Text style={styles.title}>Şifremi Unuttum</Text>
          <Text style={styles.description}>
            Lütfen e-posta adresinizi girin. Şifrenizi sıfırlamak için bir
            bağlantı göndereceğiz.
          </Text>

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

          <TouchableOpacity
            style={styles.button}
            onPress={handleResetPassword}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
            </Text>
          </TouchableOpacity>
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
    paddingTop: 40,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  formContainer: {
    padding: 20,
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
