import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import firebase from '../config/firebase';
import Header from '../components/Header';

const ExploreScreen = () => {
  const user = firebase.auth().currentUser;
  const displayName = user ? (user.displayName || 'Kullanıcı') : 'Kullanıcı';

  return (
    <View style={styles.container}>
      <Header title="Keşfet" />
      
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>Hoşgeldiniz, {displayName}</Text>
        <Text style={styles.infoText}>
          Keşfet ekranı geliştirme aşamasındadır.
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ExploreScreen;
