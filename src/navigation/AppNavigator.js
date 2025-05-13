import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import firebase from '../config/firebase';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnBoardingScreen from '../screens/OnBoardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Tab Navigator
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Kullanıcı durumu değişikliğini dinleme
  useEffect(() => {
    const subscriber = firebase.auth().onAuthStateChanged(userState => {
      setUser(userState);
      if (initializing) setInitializing(false);
    });

    // Basitlik için şimdilik true bırakıyoruz
    // Gerçek uygulamada AsyncStorage ile ilk açılışı kontrol edebilirsiniz

    return subscriber; // unsubscribe işlemini uygulama durduğunda yapacak
  }, [initializing]);

  if (initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!user ? (
          // Kullanıcı giriş yapmamışsa
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        ) : (
          // Kullanıcı giriş yapmışsa Tab Navigator'ı göster
          <Stack.Screen name="MainApp" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
