import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';
import api, { 
  fetchRiders, fetchSummary, fetchDarkStores, 
  deleteRider, updateRiderZone, fetchDarkStoreCities,
  fetchFraudReport, fetchPredictiveAnalytics
} from '../services/api';

const API_BASE = api.BASE_URL;

export default function AdminScreen({ forcedTab }) {
  const [stats, setStats] = useState(null);
  const [riders, setRiders] = useState([]);
  const [filteredRiders, setFilteredRiders] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [filteredHubs, setFilteredHubs] = useState([]);
  const [cities, setCities] = useState([]);
  const [fraudReport, setFraudReport] = useState(null);
  const [riderCities, setRiderCities] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeBar, setActiveBar] = useState(2); // Loss Analysis Bar Index
  const [riderHubs, setRiderHubs] = useState([]);
  const [filteredRiderHubs, setFilteredRiderHubs] = useState([]);
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedRiderCity, setSelectedRiderCity] = useState('All');
  const [selectedRiderHub, setSelectedRiderHub] = useState('All');
  const [loading, setLoading] = useState(true);
  const [targetRiderId, setTargetRiderId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [csvStatus, setCsvStatus] = useState(null); // { uploading, result }
  const [riderCsvStatus, setRiderCsvStatus] = useState(null); // { uploading, result }
  const [predictiveInsights, setPredictiveInsights] = useState([]);
  const [filteredPredictiveInsights, setFilteredPredictiveInsights] = useState([]);
  const [predictiveCities, setPredictiveCities] = useState([]);
  const [predictiveHubs, setPredictiveHubs] = useState([]);
  const [filteredPredictiveHubs, setFilteredPredictiveHubs] = useState([]);
  const [selectedPredictiveCity, setSelectedPredictiveCity] = useState('All');
  const [selectedPredictiveHub, setSelectedPredictiveHub] = useState('All');
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    // Load Razorpay Script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const respStats = await fetch(`${API_BASE}/admin/summary`);
      const dataStats = await respStats.json();
      setStats(dataStats);

      const respRiders = await fetch(`${API_BASE}/admin/riders`);
      const dataRiders = await respRiders.json();
      setRiders(dataRiders);
      setFilteredRiders(dataRiders);
      if (dataRiders.length > 0 && !targetRiderId) setTargetRiderId(dataRiders[0].id);

      const hubsData = await fetchDarkStores();
      setHubs(hubsData);
      setFilteredHubs(hubsData);

      const fraudData = await fetchFraudReport();
      if (fraudData && fraudData.attacks) {
        setFraudReport(fraudData);
      } else {
        // High-fidelity fallback for demo
        setFraudReport({
            total_claims: 1240, frozen_claims: 42, approved_claims: 1198,
            attacks: [
              { id: 1, type: 'GPS_TELEPORTATION', label: 'Spatial Anomaly', description: 'Rider #829 moved 4.2km in 3s.', anomaly_score: 0.89, decision: 'FROZEN' },
              { id: 2, type: 'IP_CLUSTER_SYNDICATE', label: 'IP Syndicate', description: '12 accounts on same subnet.', anomaly_score: 0.94, decision: 'FROZEN' }
            ]
        });
      }

      const respCities = await fetch(`${API_BASE}/admin/dark-stores/cities`);
      const dataCities = await respCities.json();
      setCities(dataCities.cities || []);

      const respRCities = await fetch(`${API_BASE}/admin/riders/cities`);
      const dataRCities = await respRCities.json();
      const rCities = dataRCities.cities && dataRCities.cities.length > 0 
        ? dataRCities.cities 
        : [...new Set(dataRiders.map(r => r.city || 'Unknown'))].filter(Boolean).sort();
      setRiderCities(rCities);

      const respRHubs = await fetch(`${API_BASE}/admin/riders/hubs`);
      const dataRHubs = await respRHubs.json();
      const rHubs = dataRHubs.hubs && dataRHubs.hubs.length > 0
        ? dataRHubs.hubs
        : [...new Set(dataRiders.map(r => r.hub_name))].filter(Boolean).sort();
      setRiderHubs(rHubs);
      setFilteredRiderHubs(rHubs);

      // Fetch Predictive Data
      try {
        const pData = await fetchPredictiveAnalytics();
        setPredictiveInsights(pData || []);
        setFilteredPredictiveInsights(pData || []);
        
        const pCities = [...new Set((pData || []).map(p => p.city))].filter(Boolean).sort();
        setPredictiveCities(pCities);
        
        const pHubs = [...new Set((pData || []).map(p => p.name))].filter(Boolean).sort();
        setPredictiveHubs(pHubs);
        setFilteredPredictiveHubs(pHubs);
      } catch (pe) { console.warn("Predictive data fetch failed", pe); }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async (type) => {
    // Basic mock payload for triggers
    const payload = {
      source: "admin_console",
      trigger_type: type === 'flood' ? "SEVERE_FLOOD" : "APP_SUSPENSION",
      category: type === 'flood' ? "ENVIRONMENTAL" : "APP_SUSPENSION_ORACLE",
      geo_fence: { center_lat: 12.9121, center_long: 77.6446, radius_km: 2.5 },
      severity_multiplier: 1.5,
      estimated_duration_hours: 2.0,
      zone_category: "RED"
    };

    const endpoint = type === 'flood' ? '/webhooks/imd-weather' : '/webhooks/platform-status';
    
    try {
      await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Auto-refresh after a small delay to allow background processing to finish
      setTimeout(() => {
        fetchData();
        // Second sync just to be sure (since AI processing takes time)
        setTimeout(fetchData, 2000);
      }, 800);

      Alert.alert("Success", `Simulation ${type} triggered! Database updating...`);
    } catch (e) {
      Alert.alert("Error", "Trigger failed");
    }
  };

  const handleTargetedTrigger = async (type) => {
    // Fix: Picker returns string values, rider.id is integer — use Number() cast
    const rider = riders.find(r => r.id === Number(targetRiderId));
    if (!rider) {
      showToast('Please select a rider first. If list is empty, click refresh.', 'error');
      return;
    }
    if (!rider.lat || !rider.lon) {
      showToast(`Rider ${rider.name} has no GPS data. Trigger cannot be geo-targeted.`, 'error');
      return;
    }

    let payload = {
      source: "admin_precision_strike",
      trigger_type: "CUSTOM",
      category: "ENVIRONMENTAL",
      geo_fence: { center_lat: rider.lat, center_long: rider.lon, radius_km: 50.0 },
      severity_multiplier: 1.5,
      estimated_duration_hours: 4.0,
      zone_category: "RED"
    };

    let endpoint = "/webhooks/imd-weather";

    if (type === 'flood') {
      payload.trigger_type = "SEVERE_FLOOD";
    } else if (type === 'outage') {
      payload.trigger_type = "APP_SUSPENSION";
      payload.category = "APP_SUSPENSION_ORACLE";
      payload.zone_category = "ORANGE";
      endpoint = "/webhooks/platform-status";
    } else if (type === 'strike') {
      payload.trigger_type = "STRIKE";
      payload.category = "SOCIOPOLITICAL";
      payload.severity_multiplier = 2.0;
      endpoint = "/webhooks/news-disruption";
    } else if (type === 'heat') {
      payload.trigger_type = "EXTREME_HEAT";
      payload.zone_category = "ORANGE";
      payload.severity_multiplier = 1.2;
      endpoint = "/webhooks/imd-heat";
    } else if (type === 'traffic') {
      payload.trigger_type = "ROAD_CLOSURE";
      payload.category = "INFRASTRUCTURE";
      payload.zone_category = "ORANGE";
      endpoint = "/webhooks/news-disruption";
    }

    try {
      setProcessing(true);
      await executeTrigger(endpoint, payload, rider.name);
    } catch (e) {
      setProcessing(false);
      showToast(`Strike FAILED: ${e.message}`, 'error');
    }
  };

  const executeTrigger = async (endpoint, payload, targetName) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `HTTP ${response.status}`);
    }

    showToast(`${payload.trigger_type} deployed at ${targetName}'s location. Zone updating...`, 'success');
    setTimeout(fetchData, 1000);
    setTimeout(fetchData, 3000);
    setTimeout(() => { fetchData(); setProcessing(false); }, 6000);
  };

  const handleReset = async () => {
    try {
      await fetch(`${API_BASE}/webhooks/reset`, { method: 'POST' });
      
      // Intensive refresh to ensure all hubs show GREEN
      await fetchData();
      setTimeout(fetchData, 1500);
      
      Alert.alert("Success", "System reset to base state (GREEN).");
    } catch (e) {
      Alert.alert("Error", "Reset failed");
    }
  };

  const deleteRider = async (id) => {
    if (!window.confirm("Delete this rider account?")) return;
    try {
      await fetch(`${API_BASE}/admin/riders/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      Alert.alert("Error", "Delete failed");
    }
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statGrid}>
        <StatCard title="Total Riders" value={stats?.riders_count || 0} icon="users" color="#3B82F6" />
        <StatCard title="Active Hubs" value={stats?.dark_stores_count || 0} icon="warehouse" color="#10B981" />
        <StatCard title="Total Claims" value={stats?.total_claims || 0} icon="file-invoice-dollar" color="#F59E0B" />
        <StatCard title="Total Payouts" value={`₹${stats?.total_payouts_inr?.toLocaleString() || 0}`} icon="coins" color="#2099BA" />
      </View>

      <Text style={styles.sectionTitle}>Precision Disruption Oracle</Text>

      {/* Web-friendly toast banner — appears after trigger actions */}
      {toast && (
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          borderRadius: 14, padding: 16, marginBottom: 16,
          borderWidth: 1,
          borderColor: toast.type === 'success' ? '#BBF7D0' : '#FECACA',
        }}>
          <FontAwesome5
            name={toast.type === 'success' ? 'check-circle' : 'exclamation-circle'}
            size={18}
            color={toast.type === 'success' ? '#16A34A' : '#DC2626'}
            style={{ marginRight: 12 }}
          />
          <Text style={{ flex: 1, color: toast.type === 'success' ? '#15803D' : '#B91C1C', fontWeight: '700', fontSize: 14 }}>
            {toast.msg}
          </Text>
        </View>
      )}

      <View style={styles.simContainer}>
        <View style={styles.simMainCard}>
          <View style={styles.simInfo}>
             <View style={styles.simIconContainer}>
                <FontAwesome5 name="satellite" size={24} color={colors.white} />
             </View>
             <View>
                <Text style={styles.simTitle}>Deep Space Simulation</Text>
                <Text style={styles.simSub}>Deploy targeted disruptions using precision GPS coordinates</Text>
             </View>
          </View>

          <View style={styles.targetSection}>
             <Text style={styles.targetLabel}>Target Rider Profile</Text>
             <View style={styles.pickerContainer}>
               <Picker
                 selectedValue={targetRiderId}
                 onValueChange={(val) => setTargetRiderId(val)}
                 style={styles.picker}
               >
                 {riders.map(r => (
                   <Picker.Item key={r.id} label={`${r.name} (${r.phone})`} value={r.id} />
                 ))}
               </Picker>
             </View>
          </View>

          {processing && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' }}>
              <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 10 }} />
              <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 14 }}>Execution Engine processing... Rider data will update in 3-6 seconds.</Text>
            </View>
          )}

          <View style={styles.simActions}>
             <TouchableOpacity 
                style={[styles.simBtn, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]} 
                onPress={() => handleTargetedTrigger('flood')}
             >
                <FontAwesome5 name="cloud-showers-heavy" size={14} color="#EF4444" style={{ marginRight: 8 }} theme="solid" />
                <Text style={[styles.simBtnText, { color: '#B91C1C' }]}>Flood</Text>
             </TouchableOpacity>

             <TouchableOpacity 
                style={[styles.simBtn, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]} 
                onPress={() => handleTargetedTrigger('strike')}
             >
                <FontAwesome5 name="fist-raised" size={14} color="#F97316" style={{ marginRight: 8 }} />
                <Text style={[styles.simBtnText, { color: '#C2410C' }]}>Strike</Text>
             </TouchableOpacity>

             <TouchableOpacity 
                style={[styles.simBtn, { backgroundColor: '#F0F9FF', borderColor: '#E0F2FE' }]} 
                onPress={() => handleTargetedTrigger('outage')}
             >
                <FontAwesome5 name="ghost" size={14} color="#0EA5E9" style={{ marginRight: 8 }} />
                <Text style={[styles.simBtnText, { color: '#0369A1' }]}>Outage</Text>
             </TouchableOpacity>
          </View>

          <View style={[styles.simActions, { marginTop: 12 }]}>
             <TouchableOpacity 
                style={[styles.simBtn, { backgroundColor: '#FEFCE8', borderColor: '#FEF9C3' }]} 
                onPress={() => handleTargetedTrigger('heat')}
             >
                <FontAwesome5 name="sun" size={14} color="#EAB308" style={{ marginRight: 8 }} />
                <Text style={[styles.simBtnText, { color: '#854D0E' }]}>Heatwave</Text>
             </TouchableOpacity>

             <TouchableOpacity 
                style={[styles.simBtn, { backgroundColor: '#F5F3FF', borderColor: '#EDE9FE' }]} 
                onPress={() => handleTargetedTrigger('traffic')}
             >
                <FontAwesome5 name="traffic-light" size={14} color="#8B5CF6" style={{ marginRight: 8 }} />
                <Text style={[styles.simBtnText, { color: '#6D28D9' }]}>Roadblock</Text>
             </TouchableOpacity>

             <TouchableOpacity style={styles.resetMainBtn} onPress={handleReset}>
                <FontAwesome5 name="undo" size={14} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.resetBtnText}>Reset System</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );


  const handleRiderFilters = (city, hub) => {
    setSelectedRiderCity(city);
    
    // Update available hubs based on selected city
    let hubsForCity = riderHubs;
    if (city !== 'All') {
        const uniqueHubsInCity = [...new Set(riders.filter(r => r.city === city).map(r => r.hub_name))];
        hubsForCity = uniqueHubsInCity.sort();
    }
    setFilteredRiderHubs(hubsForCity);

    // If selected hub is not in the new city's hub list, reset hub to 'All'
    let targetHub = hub;
    if (city !== 'All' && hub !== 'All' && !hubsForCity.includes(hub)) {
        targetHub = 'All';
    }
    setSelectedRiderHub(targetHub);

    let filtered = riders;
    if (city !== 'All') {
      filtered = filtered.filter(r => (r.city || 'Unknown') === city);
    }
    if (targetHub !== 'All') {
      filtered = filtered.filter(r => r.hub_name === targetHub);
    }
    setFilteredRiders(filtered);
  };

  const handleRiderCsvUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setRiderCsvStatus({ uploading: true, result: null });
      const formData = new FormData();
      formData.append('file', file);
      try {
        const resp = await fetch(`${API_BASE}/admin/riders/upload-csv`, {
          method: 'POST',
          body: formData,
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.detail || 'Upload failed');
        setRiderCsvStatus({ uploading: false, result });
        showToast(`✅ ${result.message}`, 'success');
        setTimeout(fetchData, 500);
      } catch (err) {
        setRiderCsvStatus({ uploading: false, result: null });
        showToast(`Rider CSV Upload Failed: ${err.message}`, 'error');
      }
    };
    input.click();
  };

  const renderRiders = () => (
    <View style={styles.tabContent}>
      {/* ── Rider CSV Upload Card ────────────────────────── */}
      <View style={styles.uploadCard}>
        <View style={styles.uploadLeft}>
          <View style={[styles.uploadIconBox, { backgroundColor: '#E0F2FE' }]}>
            <FontAwesome5 name="users" size={22} color="#0EA5E9" />
          </View>
          <View>
            <Text style={styles.uploadTitle}>Bulk Import Riders</Text>
            <Text style={styles.uploadSub}>CSV: ID · Name · Phone · Darkstore ID · City · Vehicle · Exp · Rating ...</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: '#0EA5E9' }]} onPress={handleRiderCsvUpload} disabled={riderCsvStatus?.uploading}>
          {riderCsvStatus?.uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome5 name="upload" size={14} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.uploadBtnText}>Upload CSV</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Rider CSV Upload Result ─────────────────────── */}
      {riderCsvStatus?.result && (
        <View style={[styles.csvResult, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
          <View style={[styles.csvStat, { borderColor: '#BAE6FD' }]}>
            <Text style={[styles.csvStatNum, { color: '#0284C7' }]}>{riderCsvStatus.result.inserted}</Text>
            <Text style={styles.csvStatLbl}>Inserted</Text>
          </View>
          <View style={[styles.csvStat, { borderColor: '#FDE68A' }]}>
            <Text style={[styles.csvStatNum, { color: '#D97706' }]}>{riderCsvStatus.result.updated}</Text>
            <Text style={styles.csvStatLbl}>Updated</Text>
          </View>
          <View style={[styles.csvStat, { borderColor: '#FECACA' }]}>
            <Text style={[styles.csvStatNum, { color: '#DC2626' }]}>{riderCsvStatus.result.skipped}</Text>
            <Text style={styles.csvStatLbl}>Skipped</Text>
          </View>
        </View>
      )}

      {/* ── Rider Filters ───────────────────────────── */}
      <View style={{ marginBottom: 20 }}>
        <View style={styles.filterBar}>
            <FontAwesome5 name="city" size={12} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={styles.filterLabel}>City:</Text>
            <View style={styles.cityPillRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {['All', ...riderCities].map(city => (
                        <TouchableOpacity
                        key={city}
                        style={[styles.cityPill, selectedRiderCity === city && styles.cityPillActive]}
                        onPress={() => handleRiderFilters(city, selectedRiderHub)}
                        >
                        <Text style={[styles.cityPillText, selectedRiderCity === city && styles.cityPillTextActive]}>
                            {city}
                        </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>

        <View style={[styles.filterBar, { marginTop: 10 }]}>
            <FontAwesome5 name="warehouse" size={12} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={styles.filterLabel}>Hub:</Text>
            <View style={styles.cityPillRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['All', ...filteredRiderHubs].map(hub => (
                <TouchableOpacity
                key={hub}
                style={[styles.cityPill, selectedRiderHub === hub && styles.cityPillActive]}
                onPress={() => handleRiderFilters(selectedRiderCity, hub)}
                >
                <Text style={[styles.cityPillText, selectedRiderHub === hub && styles.cityPillTextActive]}>
                    {hub}
                </Text>
                </TouchableOpacity>
            ))}
            </ScrollView>
            </View>
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 2 }]}>Name</Text>
          <Text style={[styles.headerText, { flex: 2 }]}>Phone</Text>
          <Text style={[styles.headerText, { flex: 2 }]}>City/Hub</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Zone</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Action</Text>
        </View>
        <FlatList
          data={filteredRiders}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{item.name}</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>ID: {item.external_id || '—'}</Text>
              </View>
              <Text style={[styles.rowText, { flex: 2 }]}>{item.phone}</Text>
              <View style={{ flex: 2 }}>
                <Text style={{ fontSize: 12, color: '#334155' }}>{item.city || '—'}</Text>
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>{item.hub_name}</Text>
              </View>
              <View style={[styles.zoneBadge, { flex: 1, backgroundColor: item.zone_category === 'RED' ? colors.danger : (item.zone_category === 'ORANGE' ? colors.warning : colors.safety) }]}>
                <Text style={styles.badgeText}>{item.zone_category}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteRider(item.id)} style={[styles.deleteBtn, { flex: 0.5 }]}>
                <FontAwesome5 name="trash" size={12} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
        <View style={styles.tableFooter}>
          <Text style={styles.tableFooterText}>{filteredRiders.length} of {riders.length} riders shown</Text>
        </View>
      </View>
    </View>
  );

  const handleCityFilter = (city) => {
    setSelectedCity(city);
    if (city === 'All') {
      setFilteredHubs(hubs);
    } else {
      setFilteredHubs(hubs.filter(h => h.city === city));
    }
  };

  const handleCsvUpload = async () => {
    // Use web file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setCsvStatus({ uploading: true, result: null });
      const formData = new FormData();
      formData.append('file', file);
      try {
        const resp = await fetch(`${API_BASE}/admin/dark-stores/upload-csv`, {
          method: 'POST',
          body: formData,
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.detail || 'Upload failed');
        setCsvStatus({ uploading: false, result });
        showToast(`✅ ${result.message}`, 'success');
        // Refresh hub list after upload
        setTimeout(fetchData, 500);
      } catch (err) {
        setCsvStatus({ uploading: false, result: null });
        showToast(`CSV Upload Failed: ${err.message}`, 'error');
      }
    };
    input.click();
  };

  const renderHubs = () => (
    <View style={styles.tabContent}>

      {/* ── CSV Upload Card ────────────────────────── */}
      <View style={styles.uploadCard}>
        <View style={styles.uploadLeft}>
          <View style={styles.uploadIconBox}>
            <FontAwesome5 name="file-csv" size={22} color="#10B981" />
          </View>
          <View>
            <Text style={styles.uploadTitle}>Bulk Import Dark Stores</Text>
            <Text style={styles.uploadSub}>CSV columns: SR. No · Darkstore ID · Darkstore Name · City · Latitude · Longitude</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.uploadBtn} onPress={handleCsvUpload} disabled={csvStatus?.uploading}>
          {csvStatus?.uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome5 name="upload" size={14} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.uploadBtnText}>Upload CSV</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── CSV Upload Result ─────────────────────── */}
      {csvStatus?.result && (
        <View style={styles.csvResult}>
          <View style={styles.csvStat}>
            <Text style={styles.csvStatNum}>{csvStatus.result.inserted}</Text>
            <Text style={styles.csvStatLbl}>Inserted</Text>
          </View>
          <View style={[styles.csvStat, { borderColor: '#FCD34D' }]}>
            <Text style={[styles.csvStatNum, { color: '#D97706' }]}>{csvStatus.result.updated}</Text>
            <Text style={styles.csvStatLbl}>Updated</Text>
          </View>
          <View style={[styles.csvStat, { borderColor: '#FECACA' }]}>
            <Text style={[styles.csvStatNum, { color: '#DC2626' }]}>{csvStatus.result.skipped}</Text>
            <Text style={styles.csvStatLbl}>Skipped</Text>
          </View>
          {csvStatus.result.errors?.length > 0 && (
            <View style={{ flex: 1, marginLeft: 16 }}>
              {csvStatus.result.errors.slice(0, 3).map((e, i) => (
                <Text key={i} style={{ fontSize: 12, color: '#EF4444', marginBottom: 4 }}>⚠ {e}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── City Filter ───────────────────────────── */}
      <View style={styles.filterBar}>
        <FontAwesome5 name="city" size={14} color="#64748B" style={{ marginRight: 12 }} />
        <Text style={styles.filterLabel}>Filter by City:</Text>
        <View style={styles.cityPillRow}>
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
      </View>

      {/* ── Hub Table ─────────────────────────────── */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 0.5 }]}>#</Text>
          <Text style={[styles.headerText, { flex: 3 }]}>Dark Store Name</Text>
          <Text style={[styles.headerText, { flex: 1.5 }]}>City</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Lat</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Lon</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Zone</Text>
        </View>
        <FlatList
          data={filteredHubs}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <FontAwesome5 name="warehouse" size={32} color="#CBD5E1" />
              <Text style={{ marginTop: 12, color: '#94A3B8', fontSize: 15 }}>No dark stores found</Text>
              <Text style={{ color: '#CBD5E1', fontSize: 13, marginTop: 4 }}>Upload a CSV to get started</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={[styles.tableRow, index % 2 === 0 && { backgroundColor: '#FAFAFA' }]}>
              <Text style={[styles.rowText, { flex: 0.5, color: '#94A3B8' }]}>{item.external_id || item.id}</Text>
              <Text style={[styles.rowText, { flex: 3, fontWeight: '700', color: '#1E293B' }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.rowText, { flex: 1.5 }]}>{item.city || '—'}</Text>
              <Text style={[styles.rowText, { flex: 1, fontSize: 12 }]}>{item.lat?.toFixed(4)}</Text>
              <Text style={[styles.rowText, { flex: 1, fontSize: 12 }]}>{item.lon?.toFixed(4)}</Text>
              <View style={[styles.zoneBadge, { flex: 1, backgroundColor:
                  item.current_zone === 'RED' ? '#FEE2E2' :
                  item.current_zone === 'ORANGE' ? '#FEF9C3' : '#DCFCE7'
              }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color:
                  item.current_zone === 'RED' ? '#DC2626' :
                  item.current_zone === 'ORANGE' ? '#D97706' : '#16A34A'
                }}>{item.current_zone}</Text>
              </View>
            </View>
          )}
        />
        <View style={styles.tableFooter}>
          <Text style={styles.tableFooterText}>{filteredHubs.length} of {hubs.length} stores shown</Text>
        </View>
      </View>
    </View>
  );

  const handlePredictiveFilters = (city, hub) => {
    setSelectedPredictiveCity(city);
    
    // Update available hubs based on selected city
    let hubsForCity = predictiveHubs;
    if (city !== 'All') {
        const uniqueHubsInCity = [...new Set(predictiveInsights.filter(p => p.city === city).map(p => p.name))];
        hubsForCity = uniqueHubsInCity.sort();
    }
    setFilteredPredictiveHubs(hubsForCity);

    // If selected hub is not in the new city's hub list, reset hub to 'All'
    let targetHub = hub;
    if (city !== 'All' && hub !== 'All' && !hubsForCity.includes(hub)) {
        targetHub = 'All';
    }
    setSelectedPredictiveHub(targetHub);

    let filtered = predictiveInsights;
    if (city !== 'All') {
      filtered = filtered.filter(p => p.city === city);
    }
    if (targetHub !== 'All') {
      filtered = filtered.filter(p => p.name === targetHub);
    }
    setFilteredPredictiveInsights(filtered);
  };

  const InteractiveLineGraph = ({ data }) => {
    const [selectedPoint, setSelectedPoint] = useState(null);
    if (!data || data.length === 0) return null;

    const maxVal = Math.max(...data.map(d => d.value), 100);
    const chartHeight = 200;
    const chartWidth = 600; // Responsive width in scrollview

    return (
      <View style={styles.chartContainer}>
         <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>₹{(maxVal/1000).toFixed(1)}k</Text>
            <Text style={[styles.axisLabel, { marginTop: 'auto' }]}>0</Text>
         </View>
         
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 50 }}>
            <View style={[styles.plotArea, { width: chartWidth, height: chartHeight }]}>
               {/* Grid Lines */}
               {[0, 1, 2, 3].map(i => (
                  <View key={i} style={[styles.gridLine, { bottom: i * (chartHeight / 4) }]} />
               ))}

               {/* Points and Tooltips */}
               {data.map((d, i) => {
                  const x = (i / (data.length - 1)) * chartWidth;
                  const y = (d.value / maxVal) * chartHeight;
                  
                  return (
                     <React.Fragment key={i}>
                        {/* Connecting Line (Simulated with div strips) */}
                        {i < data.length - 1 && (
                           <View style={[
                              styles.lineSegment, 
                              { 
                                 left: x, 
                                 bottom: y, 
                                 width: chartWidth / (data.length - 1),
                                 transform: [
                                    { rotate: `${-Math.atan2(((data[i+1].value - d.value)/maxVal) * chartHeight, chartWidth / (data.length - 1)) * (180/Math.PI)}deg` },
                                    { translateX: (chartWidth / (data.length - 1)) / 2 }
                                 ]
                              }
                           ]} />
                        )}

                        <TouchableOpacity 
                           onPress={() => setSelectedPoint(i)}
                           style={[styles.plotPoint, { left: x - 6, bottom: y - 6, backgroundColor: selectedPoint === i ? colors.accent : colors.danger }]}
                        >
                           {selectedPoint === i && (
                              <View style={styles.tooltip}>
                                 <Text style={styles.tooltipText}>₹{d.value.toLocaleString()}</Text>
                                 <Text style={styles.tooltipSub}>{d.label}</Text>
                              </View>
                           )}
                        </TouchableOpacity>
                     </React.Fragment>
                  );
               })}
            </View>
         </ScrollView>
         <View style={styles.xAxis}>
            <Text style={styles.axisLabel}>Hub Network Performance Scan (X-Axis)</Text>
         </View>
      </View>
    );
  };

  const renderLossAnalysis = () => {
    // 6-Week Mock Data for Loss Ratio
    const weeklyData = [
       { label: 'W1', value: 28 }, { label: 'W2', value: 32 }, { label: 'W3', value: 45 },
       { label: 'W4', value: 38 }, { label: 'W5', value: 34 }, { label: 'W6', value: 31 }
    ];

    // Liquidity Trend Data (INR)
    const liquidityData = [5500, 6200, 8400, 14000, 11000, 9200, 8800, 13000, 19500, 17000];

    return (
      <View style={styles.tabContent}>
         {/* ── Top Stat Row ─────────────────────────── */}
         <View style={styles.lossHeaderStats}>
            <View style={styles.lossTopStat}>
               <Text style={styles.lossTopLbl}>ACTIVE POLICIES</Text>
               <Text style={styles.lossTopVal}>12,482</Text>
            </View>
            <View style={styles.lossTopStat}>
               <Text style={styles.lossTopLbl}>TOTAL PREMIUMS</Text>
               <Text style={styles.lossTopVal}>₹18.2L</Text>
            </View>
            <View style={styles.lossTopStat}>
               <Text style={styles.lossTopLbl}>PAYOUTS MADE</Text>
               <Text style={styles.lossTopVal}>4,812</Text>
            </View>
            <View style={styles.lossTopStat}>
               <Text style={styles.lossTopLbl}>LOSS RATIO</Text>
               <Text style={[styles.lossTopVal, { color: '#38BDF8' }]}>34.2%</Text>
            </View>
            <View style={styles.lossTopStat}>
               <Text style={styles.lossTopLbl}>FRAUD PREVENTED</Text>
               <Text style={styles.lossTopVal}>₹2.4L</Text>
            </View>
         </View>

         {/* ── Main Graphical Area ─────────────────── */}
         <View style={{ flexDirection: 'row', gap: 24, marginTop: 30 }}>
            {/* 1. Loss Ratio Weekly Trend */}
            <View style={[styles.lossAnalysisCard, { flex: 2 }]}>
               <View style={styles.cardHeader}>
                  <FontAwesome5 name="chart-bar" size={16} color="#38BDF8" style={{ marginRight: 10 }} />
                  <Text style={styles.cardTitle}>Loss Ratio Weekly Trend</Text>
               </View>
               <Text style={styles.cardSub}>6-week loss ratio trend showing premiums vs claims efficiency</Text>
               
               <View style={styles.barChartContainer}>
                  <View style={styles.yAxisLabels}>
                     <Text style={styles.yLabel}>60%</Text>
                     <Text style={styles.yLabel}>45%</Text>
                     <Text style={styles.yLabel}>30%</Text>
                     <Text style={styles.yLabel}>15%</Text>
                     <Text style={styles.yLabel}>0%</Text>
                  </View>
                  <View style={styles.chartMain}>
                     <View style={styles.gridLinesContainer}>
                        {[0,1,2,3].map(i => <View key={i} style={styles.gridLineDash} />)}
                     </View>
                     <View style={styles.barsRow}>
                        {weeklyData.map((d, i) => (
                           <View key={i} style={styles.barCol}>
                              <TouchableOpacity 
                                 onPress={() => setActiveBar(i)}
                                 activeOpacity={0.8}
                                 style={[styles.barBase, { height: `${(d.value/60)*100}%`, backgroundColor: activeBar === i ? '#0EA5E9' : '#0369A1' }]}
                              >
                                 {activeBar === i && (
                                    <View style={styles.barTooltip}>
                                       <Text style={styles.tooltipVal}>lossRatio : {d.value}</Text>
                                    </View>
                                 )}
                              </TouchableOpacity>
                              <Text style={styles.xLabel}>{d.label}</Text>
                           </View>
                        ))}
                     </View>
                  </View>
               </View>
            </View>

            {/* 2. Predictive Risk Alerts Panel */}
            <View style={[styles.riskAlertsCard, { flex: 1 }]}>
               <ExpoLinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.riskGradient}>
                  <Text style={styles.riskTitle}>Predictive Risk Alerts</Text>
                  <Text style={styles.riskSub}>NEXT WEEK'S LIKELY WEATHER/DISRUPTION CLAIMS</Text>
                  
                  <View style={styles.alertList}>
                     <RiskItem city="Mumbai" trigger="Heavy Rainfall" expected="145" amount="72,500" color="#FB7185" />
                     <RiskItem city="Delhi" trigger="Extreme Heat" expected="89" amount="44,500" color="#FB923C" />
                     <RiskItem city="Chennai" trigger="Cyclone Watch" expected="62" amount="46,500" color="#FACC15" />
                     <RiskItem city="Kolkata" trigger="Flood Alert" expected="38" amount="19,000" color="#FACC15" />
                  </View>
               </ExpoLinearGradient>
            </View>
         </View>

         {/* ── Bottom Section: Liquidity Overview ── */}
         <View style={{ flexDirection: 'row', gap: 24, marginTop: 30, marginBottom: 40 }}>
            {/* 3. System Liquidity Graph */}
            <View style={[styles.lossAnalysisCard, { flex: 2, backgroundColor: '#0F172A' }]}>
               <Text style={[styles.cardTitle, { fontSize: 22 }]}>System Liquidity Overview</Text>
               <Text style={[styles.cardSub, { marginBottom: 30 }]}>Automatic parametric claim payouts vs. premium reserves (INR)</Text>
               
               <View style={styles.areaChartContainer}>
                  <View style={styles.yAxisLabels}>
                     <Text style={styles.yLabel}>₹22000</Text>
                     <Text style={styles.yLabel}>₹16500</Text>
                     <Text style={styles.yLabel}>₹11000</Text>
                     <Text style={styles.yLabel}>₹5500</Text>
                  </View>
                  <View style={styles.areaPlot}>
                     <View style={styles.liquidityGrid}>
                        {[0,1,2].map(i => <View key={i} style={styles.gridLineSolid} />)}
                     </View>
                     {/* Simulated Area Chart using a single SVG path or set of Points */}
                     <View style={styles.areaCurveMain}>
                        <ExpoLinearGradient 
                           colors={['rgba(56, 189, 248, 0.2)', 'rgba(56, 189, 248, 0.0)']} 
                           style={styles.areaFill}
                        />
                        <View style={styles.curvePointsRow}>
                           {liquidityData.map((val, i) => (
                              <View 
                                 key={i} 
                                 style={[
                                    styles.liquidityBar, 
                                    { height: (val/22000)*100 + '%' }
                                 ]} 
                              />
                           ))}
                           {/* Dotted Baseline */}
                           <View style={styles.baselineDotted} />
                        </View>
                     </View>
                  </View>
               </View>
            </View>

            {/* 4. Loss Ratio Analysis Matrix (Orange) */}
            <View style={[styles.matrixCard, { flex: 1 }]}>
               <ExpoLinearGradient colors={['#F97316', '#EA580C']} style={styles.matrixGradient}>
                  <View style={styles.matrixHeader}>
                     <Text style={styles.matrixTitle}>Loss Ratio Analysis</Text>
                     <Text style={styles.matrixSubtitle}>PREMIUMS VS CLAIMS PAID</Text>
                  </View>
                  
                  <View style={styles.matrixMain}>
                     <Text style={styles.matrixBigVal}>34.2%</Text>
                     <Text style={styles.matrixCurr}>CURRENT LOSS RATIO</Text>
                  </View>

                  <View style={styles.matrixRow}>
                     <View style={styles.matrixStat}>
                        <Text style={styles.mStatVal}>₹18.2L</Text>
                        <Text style={styles.mStatLbl}>PREMIUMS</Text>
                     </View>
                     <View style={styles.matrixStat}>
                        <Text style={styles.mStatVal}>₹6.2L</Text>
                        <Text style={styles.mStatLbl}>CLAIMS PAID</Text>
                     </View>
                  </View>

                  <View style={styles.fraudBox}>
                     <Text style={styles.fraudBoxText}>📉 Loss ratio improved by 12% due to AI fraud prevention</Text>
                  </View>
               </ExpoLinearGradient>
            </View>
         </View>
      </View>
    );
  };

  const RiskItem = ({ city, trigger, expected, amount, color }) => (
    <View style={styles.riskItem}>
       <View style={[styles.riskDot, { backgroundColor: color }]} />
       <View style={{ flex: 1 }}>
          <Text style={styles.riskCity}>{city} — {trigger}</Text>
          <Text style={styles.riskMeta}>{expected} claims expected • ₹{amount}</Text>
       </View>
    </View>
  );

  const renderPredictive = () => (
    <View style={styles.tabContent}>
      <View style={{ marginBottom: 30 }}>
         <Text style={{ fontSize: 22, fontWeight: '900', color: '#1E293B' }}>Predictive Intelligence Lab</Text>
         <Text style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>Next Week's Disruption Forecasts & Operational Viability (XGBoost Multi-Head)</Text>
      </View>

      {/* ── Predictive Filters ───────────────────────────── */}
      <View style={{ marginBottom: 20 }}>
        <View style={styles.filterBar}>
            <FontAwesome5 name="city" size={12} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={styles.filterLabel}>City:</Text>
            <View style={styles.cityPillRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {['All', ...predictiveCities].map(city => (
                        <TouchableOpacity
                        key={city}
                        style={[styles.cityPill, selectedPredictiveCity === city && styles.cityPillActive]}
                        onPress={() => handlePredictiveFilters(city, selectedPredictiveHub)}
                        >
                        <Text style={[styles.cityPillText, selectedPredictiveCity === city && styles.cityPillTextActive]}>
                            {city}
                        </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>

        <View style={[styles.filterBar, { marginTop: 10 }]}>
            <FontAwesome5 name="warehouse" size={12} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={styles.filterLabel}>Hub:</Text>
            <View style={styles.cityPillRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['All', ...filteredPredictiveHubs].map(hub => (
                <TouchableOpacity
                key={hub}
                style={[styles.cityPill, selectedPredictiveHub === hub && styles.cityPillActive]}
                onPress={() => handlePredictiveFilters(selectedPredictiveCity, hub)}
                >
                <Text style={[styles.cityPillText, selectedPredictiveHub === hub && styles.cityPillTextActive]}>
                    {hub}
                </Text>
                </TouchableOpacity>
            ))}
            </ScrollView>
            </View>
        </View>
      </View>

      <View style={styles.hubGrid}>
        {filteredPredictiveInsights.length > 0 ? filteredPredictiveInsights.map((item, idx) => (
          <View key={idx} style={[styles.hubCard, { borderTopWidth: 4, borderTopColor: item.is_payout_viable ? colors.safety : colors.danger }]}>
             <View style={styles.hubHeader}>
               <View>
                 <Text style={styles.hubName}>{item.name}</Text>
                 <Text style={styles.hubCity}>{item.city}</Text>
               </View>
               <View style={{ backgroundColor: item.is_payout_viable ? colors.safety + '15' : colors.danger + '15', padding: 6, borderRadius: 8 }}>
                  <FontAwesome5 name={item.is_payout_viable ? "check-circle" : "exclamation-triangle"} size={16} color={item.is_payout_viable ? colors.safety : colors.danger} />
               </View>
             </View>

             <View style={{ marginVertical: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                   <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>Estimated Delivery Cost</Text>
                   <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>₹{item.predicted_delivery_cost.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                   <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>Forecasted Claims (Next Wk)</Text>
                   <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>{item.forecasted_claims_next_week}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                   <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>Weather Risk Index</Text>
                   <Text style={{ fontSize: 14, fontWeight: '800', color: colors.warning }}>{item.weather_risk_index.toFixed(2)}</Text>
                </View>
             </View>

             <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B' }}>PAYOUT VIABILITY</Text>
                   <Text style={{ fontSize: 13, fontWeight: '900', color: item.is_payout_viable ? colors.safety : colors.danger }}>
                      {(item.payout_viability_score * 100).toFixed(0)}%
                   </Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                   <View style={{ width: `${item.payout_viability_score * 100}%`, height: '100%', backgroundColor: item.is_payout_viable ? colors.safety : colors.danger }} />
                </View>
             </View>

             <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.operational_efficiency === 'High' ? colors.safety : (item.operational_efficiency === 'Normal' ? colors.accent : colors.danger), marginRight: 8 }} />
                   <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Efficiency: {item.operational_efficiency}</Text>
                </View>
             </View>
          </View>
        )) : (
          <View style={{ flex: 1, padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ marginTop: 20, color: '#64748B' }}>
              {predictiveInsights.length > 0 ? 'No hubs match your filters.' : 'Running Multi-Output Regression Pipelines...'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderSecurity = () => {
    const threats = [
      { id: 1, type: 'GPS Spoofing', target: 'Rider #1204', risk: 'Critical', time: '2m ago' },
      { id: 2, type: 'Multi-Device Login', target: 'Warehouse Hub 4', risk: 'Medium', time: '15m ago' },
      { id: 3, type: 'Velocity Anomaly', target: 'Rider #882', risk: 'High', time: '34m ago' },
      { id: 4, type: 'Non-Linear Route', target: 'Rider #110', risk: 'Low', time: '1h ago' },
    ];

    return (
      <View style={styles.tabContent}>
         <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#1E293B' }}>Cyber-Shield Intelligence</Text>
            <Text style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>Real-time spatial anomaly detection & multi-vector fraud interception</Text>
         </View>

         {/* ── Security Pulse Row ────────────────────── */}
         <View style={{ flexDirection: 'row', gap: 24 }}>
            <View style={[styles.securityCard, { flex: 2 }]}>
               <ExpoLinearGradient colors={['#0F172A', '#1E293B']} style={styles.securityGradient}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                     <View>
                        <Text style={styles.secTitle}>Active Defensive Shield</Text>
                        <Text style={styles.secSub}>AI WATCHDOG IS CURRENTLY SCANNING ALL VECTORS</Text>
                     </View>
                     <View style={styles.pulseContainer}>
                        <View style={styles.pulseRing} />
                        <FontAwesome5 name="shield-alt" size={24} color="#10B981" />
                     </View>
                  </View>

                  <View style={styles.secMetricRow}>
                     <View style={styles.secMetric}>
                        <Text style={styles.secMetricVal}>4,802</Text>
                        <Text style={styles.secMetricLbl}>VECTORS SCANNED</Text>
                     </View>
                     <View style={styles.secMetric}>
                        <Text style={styles.secMetricVal}>12</Text>
                        <Text style={styles.secMetricLbl}>THREATS INTERCEPTED</Text>
                     </View>
                     <View style={styles.secMetric}>
                        <Text style={[styles.secMetricVal, { color: '#FACC15' }]}>85%</Text>
                        <Text style={styles.secMetricLbl}>ANOMALY CONFIDENCE</Text>
                     </View>
                  </View>
               </ExpoLinearGradient>
            </View>

            <View style={[styles.securityStatusCard, { flex: 1 }]}>
               <Text style={styles.statusTitle}>Network Health</Text>
               <View style={styles.healthBar}>
                  <View style={styles.healthFill} />
               </View>
               <Text style={styles.statusText}>All Dark Store nodes are synchronizing securely across 12 zones.</Text>
               <TouchableOpacity style={styles.secButton}>
                  <Text style={styles.secButtonText}>Run Deep Audit</Text>
               </TouchableOpacity>
            </View>
         </View>

         {/* ── Threat Feed ─────────────────────────── */}
         <View style={{ marginTop: 30 }}>
            <Text style={styles.sectionTitle}>Live Anomaly Feed</Text>
            <View style={styles.threatList}>
               {threats.map(t => (
                  <View key={t.id} style={styles.threatItem}>
                     <View style={[styles.threatBadge, { backgroundColor: t.risk === 'Critical' ? '#FEF2F2' : '#F8FAFC' }]}>
                        <FontAwesome5 
                           name={t.risk === 'Critical' ? 'skull-crossbones' : 'exclamation-triangle'} 
                           size={14} 
                           color={t.risk === 'Critical' ? '#DC2626' : '#64748B'} 
                        />
                     </View>
                     <View style={{ flex: 1 }}>
                        <Text style={styles.threatType}>{t.type}</Text>
                        <Text style={styles.threatMeta}>{t.target} • Detect in {t.time}</Text>
                     </View>
                     <View style={[styles.riskTag, { borderColor: t.risk === 'Critical' ? '#DC2626' : '#CBD5E1' }]}>
                        <Text style={[styles.riskTagText, { color: t.risk === 'Critical' ? '#DC2626' : '#64748B' }]}>{t.risk}</Text>
                     </View>
                     <TouchableOpacity style={styles.interceptBtn}>
                        <Text style={styles.interceptText}>INTERCEPT</Text>
                     </TouchableOpacity>
                  </View>
               ))}
            </View>
         </View>
      </View>
    );
  };


  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loaderText}>Accessing Master Control...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Command Center</Text>
          <Text style={styles.subtitle}>System Intelligence & Manual Overrides</Text>
        </View>
        <TouchableOpacity 
            style={[styles.refreshBtn, loading && { backgroundColor: '#64748B' }]} 
            onPress={fetchData} 
            disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <FontAwesome5 name="sync-alt" size={16} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TabItem label="Overview" active={activeTab === 'Overview'} onPress={() => setActiveTab('Overview')} />
        <TabItem label="Rider Fleet" active={activeTab === 'Riders'} onPress={() => setActiveTab('Riders')} />
        <TabItem label="Hub Network" active={activeTab === 'Hubs'} onPress={() => setActiveTab('Hubs')} />
        <TabItem label="Predictive Labs" active={activeTab === 'Predictive'} onPress={() => setActiveTab('Predictive')} />
        <TabItem label="Security" active={activeTab === 'Security'} onPress={() => setActiveTab('Security')} />
        <TabItem label="Loss Analysis" active={activeTab === 'LossAnalysis'} onPress={() => setActiveTab('LossAnalysis')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Riders' && renderRiders()}
        {activeTab === 'Hubs' && renderHubs()}
        {activeTab === 'Predictive' && renderPredictive()}
        {activeTab === 'Security' && renderSecurity()}
        {activeTab === 'LossAnalysis' && renderLossAnalysis()}
      </ScrollView>
    </View>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <FontAwesome5 name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );
}

function ActionButton({ label, sub, icon, color, onPress }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <FontAwesome5 name={icon} size={24} color={colors.white} />
      </View>
      <View>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

function TabItem({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
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
    marginBottom: 48,
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
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginRight: 10,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 40,
  },
  statCard: {
    width: '23%',
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  actionBtn: {
    width: '31%',
    minWidth: 250,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  actionIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowText: {
    fontSize: 14,
    color: '#334155',
  },
  zoneBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  hubCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  hubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  hubDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hubName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  hubSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    marginBottom: 20,
  },
  hubActions: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  miniBtn: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  simContainer: {
    marginBottom: 40,
  },
  simMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  simInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  simIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  simTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  simSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  targetSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  picker: {
    height: 56,
    width: '100%',
    color: '#1E293B',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  simActions: {
    flexDirection: 'row',
    gap: 16,
  },
  simBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  simBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  resetMainBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
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
  },
  tabContent: {
    paddingBottom: 40,
  },
  // CSV Upload Card
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  uploadIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  uploadSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 150,
    justifyContent: 'center',
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  // CSV Result Panel
  csvResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 16,
  },
  csvStat: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#FFFFFF',
    minWidth: 80,
  },
  csvStatNum: {
    fontSize: 28,
    fontWeight: '900',
    color: '#16A34A',
  },
  csvStatLbl: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  // City Filter
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 8,
  },
  cityPillRow: {
    flexDirection: 'row',
    flex: 1,
  },
  cityPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cityPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  cityPillTextActive: {
    color: '#FFFFFF',
  },
  // Table Footer
  tableFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableFooterText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  financialCard: {
    marginBottom: 30,
    borderRadius: 30,
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
  },
  financialGradient: {
    padding: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 200,
  },
  finLeft: {
    flex: 1,
  },
  finBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  finBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  finTotalTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  finTotalVal: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  finCurrency: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
    marginBottom: 6,
  },
  finRight: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  impactGraph: {
    flex: 1,
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  impactCol: {
    width: 36,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  impactBar: {
    width: '100%',
  },
  impactLbl: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  finStats: {
    gap: 20,
    paddingLeft: 30,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  finStatItem: {
  },
  finStatVal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  finStatLbl: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  finStatDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  // Loss Analysis Page
  lossSection: {
    marginBottom: 40,
  },
  lossGlassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  lossCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
  },
  gaugeContainer: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeBase: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  gaugeVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
  },
  gaugeLbl: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '800',
    marginTop: 4,
  },
  lossCardDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 15,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  cityName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  barStack: {
    flex: 1,
    height: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stackBar: {
    height: '100%',
  },
  cityNet: {
    width: 50,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  legItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  leaderboardScroll: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  leaderRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  leaderCity: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  leaderLoss: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 4,
  },
  lossSpark: {
    height: 3,
    backgroundColor: '#EF4444',
    borderRadius: 2,
    alignSelf: 'flex-end',
  },
  deltaGrid: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 20,
  },
  deltaCard: {
    flex: 1,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  deltaTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 12,
  },
  deltaValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 4,
  },
  // Line Graph
  chartContainer: {
    flexDirection: 'row',
    height: 250,
  },
  yAxis: {
    width: 40,
    height: 200,
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 40,
    right: 0,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  axisLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
  },
  plotArea: {
    position: 'relative',
    marginTop: 10,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  plotPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    zIndex: 5,
  },
  tooltip: {
    position: 'absolute',
    bottom: 20,
    left: -60,
    width: 120,
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 20,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  tooltipSub: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  // High-Fidelity Loss Analysis Redesign
  lossHeaderStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 30,
  },
  lossTopStat: {
    alignItems: 'center',
  },
  lossTopLbl: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
  },
  lossTopVal: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  lossAnalysisCard: {
    backgroundColor: '#0F172A',
    borderRadius: 32,
    padding: 35,
    borderWidth: 1,
    borderColor: '#1E293B',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 40,
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 220,
  },
  yAxisLabels: {
    width: 60,
    justifyContent: 'space-between',
    height: 180,
  },
  yLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  chartMain: {
    flex: 1,
    height: 180,
    position: 'relative',
  },
  gridLinesContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-between',
  },
  gridLineDash: {
    height: 1,
    backgroundColor: '#1E293B',
    width: '100%',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    zIndex: 10,
  },
  barCol: {
    width: 60,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barBase: {
    width: 48,
    borderRadius: 8,
    position: 'relative',
  },
  barTooltip: {
    position: 'absolute',
    top: -50,
    left: -40,
    width: 130,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    zIndex: 100,
  },
  tooltipVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  xLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 15,
  },
  // Risk Panel
  riskAlertsCard: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  riskGradient: {
    flex: 1,
    padding: 35,
  },
  riskTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  riskSub: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 40,
  },
  alertList: {
    gap: 15,
  },
  riskItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 16,
  },
  riskCity: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  riskMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  // Liquidity Area Chart
  areaChartContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  areaPlot: {
    flex: 1,
    height: 250,
    position: 'relative',
  },
  liquidityGrid: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
  },
  gridLineSolid: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  areaCurveMain: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  areaFill: {
    ...StyleSheet.absoluteFillObject,
  },
  curvePointsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  liquidityBar: {
    width: 12,
    backgroundColor: '#0EA5E9',
    borderRadius: 6,
    marginHorizontal: 2,
    opacity: 0.8,
  },
  baselineDotted: {
    position: 'absolute',
    bottom: '30%',
    left: 0,
    right: 0,
    height: 2,
    borderTopWidth: 2,
    borderColor: '#38BDF8',
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  // Matrix Card (Orange)
  matrixCard: {
    borderRadius: 40,
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(234, 88, 12, 0.2)',
  },
  matrixGradient: {
    flex: 1,
    padding: 40,
    justifyContent: 'space-between',
    minHeight: 450,
  },
  matrixHeader: {
    marginBottom: 20,
  },
  matrixTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  matrixSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginTop: 8,
  },
  matrixMain: {
    alignItems: 'center',
    marginVertical: 40,
  },
  matrixBigVal: {
    fontSize: 90,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -4,
  },
  matrixCurr: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    borderRadius: 24,
  },
  mStatVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  mStatLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  fraudBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    alignItems: 'center',
  },
  fraudBoxText: {
    color: '#FFEDD5',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Security Tab Styles
  securityCard: {
    borderRadius: 32,
    overflow: 'hidden',
    boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
  },
  securityGradient: {
    padding: 35,
    minHeight: 250,
    justifyContent: 'space-between',
  },
  secTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  secSub: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  pulseContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#10B981',
    opacity: 0.3,
  },
  secMetricRow: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 30,
  },
  secMetric: {
    alignItems: 'flex-start',
  },
  secMetricVal: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  secMetricLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
  },
  securityStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 35,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 16,
  },
  healthBar: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    marginBottom: 20,
    overflow: 'hidden',
  },
  healthFill: {
    width: '94%',
    height: '100%',
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 24,
  },
  secButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  secButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  threatList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  threatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 16,
  },
  threatBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threatType: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  threatMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  riskTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  riskTagText: {
    fontSize: 10,
    fontWeight: '900',
  },
  interceptBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  interceptText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '900',
  },
});
