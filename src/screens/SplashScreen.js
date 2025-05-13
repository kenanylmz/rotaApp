import React, {useEffect} from 'react';
import {View, Text, Image, StyleSheet, StatusBar} from 'react-native';

const SplashScreen = ({navigation}) => {
  useEffect(() => {
    // 3 saniye sonra OnBoarding ekranına yönlendir
    const timer = setTimeout(() => {
      navigation.replace('OnBoarding'); // Replace kullanarak geri tuşuyla splash ekrana dönmeyi engelliyoruz
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E90FF" barStyle="light-content" />
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>ROTA</Text>
      <Text style={styles.subtitle}>Yolculuğunun Rotasını Belirle</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E90FF', // Düz mavi arka plan
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
});

export default SplashScreen;
