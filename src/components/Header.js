import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';

const Header = ({title}) => {
  return (
    <View style={styles.header}>
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.headerTitle}>{title || 'ROTA'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default Header;
