import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ShieldDashboard from './screens/ShieldDashboard';
import SettlementScreen from './screens/SettlementScreen';
import PremiumBreakdownScreen from './screens/PremiumBreakdownScreen';
import TriggerStatusScreen from './screens/TriggerStatusScreen';
import FraudAlertScreen from './screens/FraudAlertScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminScreen from './screens/AdminScreen';
import WeatherScreen from './screens/WeatherScreen';
import SettlementHistoryScreen from './screens/SettlementHistoryScreen';
import ResponsiveLayout from './components/ResponsiveLayout';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  
  useEffect(() => {
    // Basic Web-only deep link handler for /admin
    if (Platform.OS === 'web') {
      const path = window.location.pathname;
      if (path === '/admin' || window.location.hash === '#/admin') {
        setCurrentScreen('Admin');
      }
    }
  }, []);
  
  // Shared rider context — set during login or onboarding, consumed by all screens
  const [riderContext, setRiderContext] = useState({
    rider_id: null,
    name: 'Guest Rider',
    hub: 'Detecting Location...',
    zone: 'green',
    platform: 'Aegesis',
    dpdt: 100,
    hourly_wage: 150,
  });

  const handleScreenChange = (screen) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    // Handle parameterized screens like 'Settlement:flood' or 'Settlement:app_suspension'
    const [screenName, param] = currentScreen.split(':');

    switch(screenName) {
      case 'Login':
        return (
          <LoginScreen 
            setScreen={handleScreenChange} 
            setRiderContext={setRiderContext} 
          />
        );
      case 'Onboarding':
        return (
          <OnboardingScreen 
            setScreen={handleScreenChange} 
            setRiderContext={setRiderContext}
            prefillPhone={param || ''}
          />
        );
      case 'Dashboard':
        return (
          <ShieldDashboard 
            setScreen={handleScreenChange} 
            riderContext={riderContext} 
            setRiderContext={setRiderContext}
          />
        );
      case 'Settlement':
        return (
          <SettlementScreen 
            setScreen={handleScreenChange} 
            riderContext={riderContext}
            triggerType={param || 'flood'}
          />
        );
      case 'PremiumBreakdown':
        return (
          <PremiumBreakdownScreen 
            setScreen={handleScreenChange} 
            riderContext={riderContext} 
          />
        );
      case 'TriggerStatus':
        return (
          <TriggerStatusScreen 
            setScreen={handleScreenChange} 
            riderContext={riderContext} 
          />
        );
      case 'FraudAlert':
        return (
          <FraudAlertScreen 
            setScreen={handleScreenChange} 
          />
        );
      case 'Profile':
        return (
          <ProfileScreen 
            setScreen={handleScreenChange} 
            riderContext={riderContext}
          />
        );
      case 'Admin':
        return (
          <AdminScreen 
            setScreen={handleScreenChange} 
            forcedTab={param}
          />
        );
      case 'Admin:Hubs':
        return <AdminScreen forcedTab="Hubs" />;
      case 'Admin:Security':
        return <AdminScreen forcedTab="Security" />;
      case 'Admin:Predictive':
        return <AdminScreen forcedTab="Predictive" />;
      case 'Admin:LossAnalysis':
        return <AdminScreen forcedTab="LossAnalysis" />;
      case 'Weather':
        return <WeatherScreen />;
      case 'SettlementHistory':
        return <SettlementHistoryScreen setScreen={handleScreenChange} riderContext={riderContext} />;
      default:
        return (
          <LoginScreen 
            setScreen={handleScreenChange} 
            setRiderContext={setRiderContext} 
          />
        );
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <ResponsiveLayout currentScreen={currentScreen} setScreen={handleScreenChange}>
        {renderScreen()}
      </ResponsiveLayout>
    </>
  );
}
