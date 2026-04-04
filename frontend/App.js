import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ShieldDashboard from './screens/ShieldDashboard';
import SettlementScreen from './screens/SettlementScreen';
import PremiumBreakdownScreen from './screens/PremiumBreakdownScreen';
import TriggerStatusScreen from './screens/TriggerStatusScreen';
import FraudAlertScreen from './screens/FraudAlertScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  
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
      {renderScreen()}
    </>
  );
}
