import React from 'react';
import {Platform, StyleSheet, View, Dimensions} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome';

// Screens
import MapScreen from '../screens/MapScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const windowWidth = Dimensions.get('window').width;

// Özel Tab Bar Button bileşeni
const TabBarIcon = ({focused, iconName, label, color}) => {
  return (
    <View style={styles.tabIconContainer}>
      {focused && <View style={styles.activeIndicator} />}
      <View
        style={[styles.iconWrapper, focused ? styles.activeIconWrapper : null]}>
        <Icon name={iconName} size={22} color={focused ? '#FFFFFF' : color} />
      </View>
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Keşfet"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E90FF',
        tabBarInactiveTintColor: '#888',
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
      }}>
      <Tab.Screen
        name="Keşfet"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({focused, color}) => (
            <TabBarIcon
              focused={focused}
              color={color}
              iconName="compass"
              label="Keşfet"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Harita"
        component={MapScreen}
        options={{
          tabBarIcon: ({focused, color}) => (
            <TabBarIcon
              focused={focused}
              color={color}
              iconName="map"
              label="Harita"
            />
          ),
        }}
      />
      <Tab.Screen
        name="YerDetayları"
        component={PlaceDetailsScreen}
        options={{
          tabBarLabel: 'Yerler',
          tabBarIcon: ({focused, color}) => (
            <TabBarIcon
              focused={focused}
              color={color}
              iconName="map-marker"
              label="Yerler"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({focused, color}) => (
            <TabBarIcon
              focused={focused}
              color={color}
              iconName="user"
              label="Profil"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  tabBarItem: {
    height: 60,
    marginTop: 5,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
  },
  tabIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeIconWrapper: {
    backgroundColor: '#1E90FF',
    shadowColor: '#1E90FF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: -5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E90FF',
  },
});

export default TabNavigator;
