import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import colors from '../theme/colors';
import api from '../services/api';

const API_BASE = api.BASE_URL;

export default function WeatherScreen() {
  const [hubs, setHubs] = useState([]);
  const [filteredHubs, setFilteredHubs] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('All');
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState({}); // { hubId: { temp, condition, icon } }
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/admin/dark-stores`);
      const data = await resp.json();
      setHubs(data);
      setFilteredHubs(data);

      const respCities = await fetch(`${API_BASE}/admin/dark-stores/cities`);
      const dataCities = await respCities.json();
      setCities(dataCities.cities || []);

      // Fetch weather for all hubs
      fetchAllWeather(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllWeather = async (hubList) => {
    // Open-Meteo is used for production reliability (no key required for basic tier)
    const list = hubList; // Open-Meteo handles parallel batches well
    
    // Process in smaller batches of 5 to avoid browser request limits
    const batchSize = 5;
    for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize);
        await Promise.all(batch.map(async (hub) => {
            try {
                if (weatherData[hub.id]) return;

                const url = `https://api.open-meteo.com/v1/forecast?latitude=${hub.lat}&longitude=${hub.lon}&current=temperature_2m,wind_speed_10m,weather_code`;
                const resp = await fetch(url);
                const data = await resp.json();
                
                if (data.current) {
                    const res = {
                        id: hub.id,
                        temp: Math.round(data.current.temperature_2m),
                        wind: data.current.wind_speed_10m,
                        code: data.current.weather_code,
                        ...translateWeatherCode(data.current.weather_code)
                    };
                    setWeatherData(prev => ({...prev, [hub.id]: res}));
                }
            } catch (err) {
                console.warn(`Failed fetch for hub ${hub.id}`);
            }
        }));
    }
  };

  const translateWeatherCode = (code) => {
    // WMO Weather interpretation (Open-Meteo)
    if (code === 0) return { condition: 'Clear Sky', icon: 'sun', color: '#FCD34D' };
    if (code >= 1 && code <= 3) return { condition: 'Partly Cloudy', icon: 'cloud-sun', color: '#94A3B8' };
    if (code === 45 || code === 48) return { condition: 'Foggy', icon: 'smog', color: '#CBD5E1' };
    if (code >= 51 && code <= 55) return { condition: 'Drizzle', icon: 'cloud-rain', color: '#60A5FA' };
    if (code >= 61 && code <= 65) return { condition: 'Rain', icon: 'cloud-showers-heavy', color: '#3B82F6' };
    if (code >= 71 && code <= 77) return { condition: 'Snowfall', icon: 'snowflake', color: '#E2E8F0' };
    if (code >= 80 && code <= 82) return { condition: 'Rain Showers', icon: 'cloud-showers-heavy', color: '#2563EB' };
    if (code >= 95) return { condition: 'Thunderstorm', icon: 'bolt', color: '#F59E0B' };
    return { condition: 'Overcast', icon: 'cloud', color: '#64748B' };
  };

  const handleCityFilter = (city) => {
    setSelectedCity(city);
    if (city === 'All') {
      setFilteredHubs(hubs);
    } else {
      setFilteredHubs(hubs.filter(h => h.city === city));
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loaderText}>Syncing with Weather Satellites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Weather Intelligence</Text>
          <Text style={styles.subtitle}>Real-time Environmental Monitoring for Hub Logistics</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => {setRefreshing(true); fetchHubs().then(() => setRefreshing(false));}}>
          {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome5 name="sync-alt" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* City Filter */}
      <View style={styles.filterBar}>
        <FontAwesome5 name="city" size={14} color="#64748B" style={{ marginRight: 12 }} />
        <Text style={styles.filterLabel}>Select City:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['All', ...cities].map(city => (
            <TouchableOpacity
              key={city}
              style={[styles.cityPill, selectedCity === city && styles.cityPillActive]}
              onPress={() => handleCityFilter(city)}
            >
              <Text style={[styles.cityPillText, selectedCity === city && styles.cityPillTextActive]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.grid}>
        {filteredHubs.map(hub => {
          const weather = weatherData[hub.id] || { temp: '--', condition: 'Fetching...', icon: 'cloud', color: '#E2E8F0' };
          
          // isExtreme logic adjusted for Tomorrow.io codes
          // 4001: Rain, 4201: Heavy Rain, 8000: Thunderstorm, >38: Extreme Heat
          const isExtreme = weather.temp > 38 || (weather.code >= 61 && weather.code <= 65) || weather.code >= 95;

          return (
            <View key={hub.id} style={[styles.weatherCard, isExtreme && styles.extremeCard]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.hubName} numberOfLines={1}>{hub.name}</Text>
                  <Text style={styles.hubCity}>{hub.city}</Text>
                </View>
                <View style={[styles.weatherIconBox, { backgroundColor: weather.color + '15' }]}>
                  <FontAwesome5 name={weather.icon} size={20} color={weather.color} />
                </View>
              </View>

              <View style={styles.tempSection}>
                <Text style={styles.tempText}>{weather.temp}°</Text>
                <View>
                  <Text style={[styles.conditionText, { color: weather.color }]}>{weather.condition}</Text>
                  {weather.wind && <Text style={styles.windText}>{weather.wind} km/h Wind</Text>}
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, { backgroundColor: isExtreme ? '#FEE2E2' : '#F1F5F9' }]}>
                    <View style={[styles.statusDot, { backgroundColor: isExtreme ? '#EF4444' : '#10B981' }]} />
                    <Text style={[styles.statusText, { color: isExtreme ? '#EF4444' : '#64748B' }]}>
                        {isExtreme ? 'RISK HIGH' : 'OPERATIONAL'}
                    </Text>
                </View>
                {isExtreme && (
                    <TouchableOpacity style={styles.alertBtn}>
                        <FontAwesome5 name="exclamation-triangle" size={12} color="#fff" />
                    </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 40,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 15,
  },
  cityPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  cityPillActive: {
    backgroundColor: colors.accent,
  },
  cityPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  cityPillTextActive: {
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  weatherCard: {
    width: '31%',
    minWidth: 280,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  extremeCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  hubName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    width: 180,
  },
  hubCity: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  weatherIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  tempText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1E293B',
    marginRight: 15,
  },
  conditionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  windText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loaderText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  }
});
