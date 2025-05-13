import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

const {width, height} = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Rotanı Keşfet',
    description:
      'Dünyanın dört bir yanındaki rotaları keşfet ve kendi seyahat planını oluştur.',
    image: require('../assets/images/onboarding1.jpg'),
  },
  {
    id: '2',
    title: 'Anılarını Kaydet',
    description:
      'Seyahatlerini haritada işaretle, fotoğraflar ekle ve anılarını not al.',
    image: require('../assets/images/onboarding2.jpg'),
  },
  {
    id: '3',
    title: 'Deneyimlerini Paylaş',
    description: 'Keşfettiğin rotaları ve anılarını arkadaşlarınla paylaş.',
    image: require('../assets/images/onboarding3.jpg'),
  },
];

const OnBoardingScreen = ({navigation}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef(null);

  const updateCurrentSlideIndex = e => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const goToNextSlide = () => {
    const nextSlideIndex = currentSlideIndex + 1;

    if (nextSlideIndex < slides.length) {
      flatListRef.current.scrollToIndex({
        index: nextSlideIndex,
        animated: true,
      });
    } else {
      // Son slayt ise, Login ekranına gitsin
      navigation.navigate('Login');
    }
  };

  const skip = () => {
    navigation.navigate('Login');
  };

  const renderSlide = ({item}) => {
    return (
      <View style={styles.slideContainer}>
        <Image source={item.image} style={styles.image} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const Footer = () => {
    return (
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlideIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {currentSlideIndex === slides.length - 1 ? (
            <TouchableOpacity style={styles.button} onPress={skip}>
              <Text style={styles.buttonText}>Başla</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.buttonsRow}>
              <TouchableOpacity style={styles.skipButton} onPress={skip}>
                <Text style={styles.skipButtonText}>Atla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={goToNextSlide}>
                <Text style={styles.buttonText}>İleri</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="light-content"
      />
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        keyExtractor={item => item.id}
      />
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Arka plan rengini siyah yaparak beyaz boşlukları gizleyelim
  },
  slideContainer: {
    width,
    height,
    alignItems: 'center',
  },
  image: {
    width,
    height,
    resizeMode: 'cover',
  },
  textContainer: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  indicator: {
    height: 10,
    width: 10,
    backgroundColor: 'grey',
    marginHorizontal: 5,
    borderRadius: 5,
  },
  activeIndicator: {
    backgroundColor: '#1E90FF',
    width: 25,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    backgroundColor: '#1E90FF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  skipButtonText: {
    color: '#fff', // Atla yazısının rengini beyaz yapalım
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnBoardingScreen;
