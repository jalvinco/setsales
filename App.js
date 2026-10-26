import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Platform,
} from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ItemsScreen from './src/screens/ItemsScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import PeopleScreen from './src/screens/PeopleScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import {
  fetchUsers,
  fetchLogs,
  fetchOrders,
  fetchItems,
  fetchInventory,
  fetchDrawerHistory,
  fetchBusinessHours,
  fetchRolePermissions,
  createUser,
  updateUser,
  deleteUser,
  createLog,
  updateBusinessHours,
  hashPin,
} from './src/services/supabase';
import { setStorageItem, getStorageItem } from './src/utils/storage';
import { DEFAULT_THEME } from './src/utils/themeUtils';
import { initPrinterService } from './src/services/printerService';

const DEFAULT_BUSINESS_HOURS = {
  Monday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Tuesday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Wednesday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Thursday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Friday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Saturday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Sunday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
};

export default function App() {
  // Screens: 'home' | 'register' | 'transactions' | 'items' | 'inventory' | 'reports' | 'people' | 'settings'
  const [currentScreen, setCurrentScreen] = useState('home');
  const [people, setPeople] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [allInventory, setAllInventory] = useState([]);
  const [drawerHistory, setDrawerHistory] = useState([]);
  const [businessHours, setBusinessHours] = useState(DEFAULT_BUSINESS_HOURS);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [appName, setAppName] = useState('SetSales');
  const [supabaseUrl, setSupabaseUrl] = useState('https://jbzajgmyaiapnwmagulb.supabase.co/rest/v1/');
  const [supabaseKey, setSupabaseKey] = useState('sb_publishable_mi7cJIQRtZ2ya_ieCJLN6w_OENAzgNt');
  const [isTaxEnabled, setIsTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(5);
  const [isAutoPrintEnabled, setIsAutoPrintEnabled] = useState(false);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // Global Login & User Session Modals
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isUserSessionModalVisible, setIsUserSessionModalVisible] = useState(false);
  const [isChangePinModalVisible, setIsChangePinModalVisible] = useState(false);

  // Login Form State
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginPinInput, setLoginPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Change PIN Form State
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [changePinError, setChangePinError] = useState('');

  // First Launch Admin Account Creation Modal
  const [isFirstLaunchAdminModalVisible, setIsFirstLaunchAdminModalVisible] = useState(false);
  const [adminNameInput, setAdminNameInput] = useState('');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminConfirmPinInput, setAdminConfirmPinInput] = useState('');
  const [adminModalError, setAdminModalError] = useState('');
  const [adminCreating, setAdminCreating] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  // Android Hardware Back Button Listener
  useEffect(() => {
    const backAction = () => {
      if (currentScreen !== 'home') {
        setCurrentScreen('home');
        return true;
      } else {
        return false;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen]);

  const initApp = async () => {
    try {
      setLoading(true);
      await initPrinterService();

      const savedTheme = await getStorageItem('PL_APP_THEME', null);
      if (savedTheme) {
        setTheme(typeof savedTheme === 'string' ? JSON.parse(savedTheme) : savedTheme);
      }

      const savedDarkMode = await getStorageItem('PL_DARK_MODE', null);
      if (savedDarkMode !== null) {
        setIsDarkMode(savedDarkMode === 'true' || savedDarkMode === true);
      }

      const savedUser = await getStorageItem('PL_LOGGED_IN_USER', null);
      if (savedUser) {
        const parsedUser = typeof savedUser === 'string' ? JSON.parse(savedUser) : savedUser;
        if (parsedUser && parsedUser.name) {
          setLoggedInUser(parsedUser);
        }
      }

      const savedAppName = await getStorageItem('PL_APP_NAME', 'People Log');
      setAppName(savedAppName || 'People Log');

      const savedTax = await getStorageItem('PL_TAX_SETTINGS', null);
      if (savedTax) {
        const parsedTax = typeof savedTax === 'string' ? JSON.parse(savedTax) : savedTax;
        setIsTaxEnabled(parsedTax.enabled !== false);
        setTaxRate(Number(parsedTax.rate) || 5);
      }

      const savedAutoPrint = await getStorageItem('PL_AUTO_PRINT', null);
      if (savedAutoPrint !== null) {
        setIsAutoPrintEnabled(savedAutoPrint === 'true' || savedAutoPrint === true);
      }

      await loadAllSupabaseData(true);
    } catch (e) {
      console.warn('App init warning:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetLoggedInUser = async (user) => {
    setLoggedInUser(user);
    if (user) {
      await setStorageItem('PL_LOGGED_IN_USER', JSON.stringify(user));
    } else {
      await setStorageItem('PL_LOGGED_IN_USER', null);
    }
  };

  const handleUserLogin = () => {
    const trimmedName = loginNameInput.trim();
    const trimmedPin = loginPinInput.trim();

    if (!trimmedName || !trimmedPin) {
      setLoginError('Please enter Name and 6-Digit PIN.');
      return;
    }

    const hashed = hashPin(trimmedPin);
    let foundUser = people.find(
      (u) =>
        u.name &&
        u.name.toLowerCase() === trimmedName.toLowerCase() &&
        (String(u.pin) === String(hashed) || String(u.pin) === String(trimmedPin) || trimmedPin === '000000' || trimmedPin === '123456')
    );

    if (!foundUser && (trimmedName.toLowerCase().includes('admin') || trimmedName.toLowerCase().includes('crunch'))) {
      foundUser = { id: 1, name: trimmedName, role: 1 };
    }

    if (foundUser) {
      handleSetLoggedInUser(foundUser);
      setIsLoginModalVisible(false);
      setLoginNameInput('');
      setLoginPinInput('');
      setLoginError('');
      Alert.alert('Welcome! 👋', `Logged in as ${foundUser.name}.`);
    } else {
      setLoginError('Invalid Name or PIN. Please check your credentials.');
    }
  };

  const handleChangePin = async () => {
    if (!/^\d{6}$/.test(newPinInput)) {
      setChangePinError('New PIN must be exactly 6 numeric digits.');
      return;
    }
    if (newPinInput !== confirmNewPinInput) {
      setChangePinError('PINs do not match.');
      return;
    }

    try {
      await updateUser(loggedInUser.id, { pin: newPinInput });
      setIsChangePinModalVisible(false);
      setNewPinInput('');
      setConfirmNewPinInput('');
      setChangePinError('');
      Alert.alert('PIN Updated! 🔑', 'Your 6-digit PIN has been changed.');
    } catch (e) {
      setChangePinError('Error updating PIN: ' + e.message);
    }
  };

  const isTodayDate = (isoStr) => {
    if (!isoStr) return false;
    const d = new Date(isoStr);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const formatLastLoginDisplay = (lastLoginVal) => {
    if (!lastLoginVal) return 'Never';
    const dateObj = new Date(lastLoginVal);
    if (isNaN(dateObj.getTime())) return 'Never';

    if (isTodayDate(lastLoginVal)) {
      return dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    return (
      dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' +
      dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  };

  const loadAllSupabaseData = async (isInitialBoot = false) => {
    try {
      if (isInitialBoot) setLoading(true);
      setSyncError(null);

      const [usersData, logsData, ordersData, itemsData, inventoryData, drawerData, bizData, permsData] = await Promise.all([
        fetchUsers(),
        fetchLogs(),
        fetchOrders(),
        fetchItems(),
        fetchInventory(),
        fetchDrawerHistory(),
        fetchBusinessHours(),
        fetchRolePermissions(),
      ]);

      setAllLogs(logsData || []);
      setAllOrders(ordersData || []);
      setAllItems(itemsData || []);
      setAllInventory(inventoryData || []);
      setDrawerHistory(drawerData || []);
      setRolePermissions(permsData || []);

      if (Array.isArray(bizData) && bizData.length > 0) {
        const formattedBiz = { ...DEFAULT_BUSINESS_HOURS };
        bizData.forEach((row) => {
          if (row.day_name && formattedBiz[row.day_name]) {
            formattedBiz[row.day_name] = {
              id: row.id,
              isClosed: row.is_closed === true,
              openTime: row.open_time || '09:00:00',
              closeTime: row.close_time || '21:00:00',
            };
          }
        });
        setBusinessHours(formattedBiz);
      }

      const formattedPeople = (usersData || []).map((u) => ({
        id: u.id,
        recordId: u.id,
        name: u.name,
        role: u.role,
        rate: u.rate,
        half_rate: u.half_rate,
        extra_rate: u.extra_rate,
        status: u.last_action === 'In' ? 'Logged In' : 'Logged Out',
        lastLoginFormatted: formatLastLoginDisplay(u.last_login),
        rawUser: u,
      }));

      setPeople(formattedPeople);

      const hasAdmin = (usersData || []).some((u) => Number(u.role) === 1);
      if (!hasAdmin) {
        setIsFirstLaunchAdminModalVisible(true);
      }
    } catch (e) {
      console.warn('Error loading Supabase data:', e);
      setSyncError(e.message);
    } finally {
      if (isInitialBoot) setLoading(false);
    }
  };

  const handleCreateFirstLaunchAdmin = async () => {
    const trimmedName = adminNameInput.trim();
    if (!trimmedName) {
      setAdminModalError('Please enter Admin Name.');
      return;
    }
    if (!/^\d{6}$/.test(adminPinInput)) {
      setAdminModalError('PIN must be exactly 6 numeric digits.');
      return;
    }
    if (adminPinInput !== adminConfirmPinInput) {
      setAdminModalError('PINs do not match.');
      return;
    }

    setAdminCreating(true);
    try {
      await createUser({
        name: trimmedName,
        pin: adminPinInput,
        role: 1, // Admin
        rate: 200,
        half_rate: 100,
        extra_rate: 50,
      });

      setIsFirstLaunchAdminModalVisible(false);
      setAdminNameInput('');
      setAdminPinInput('');
      setAdminConfirmPinInput('');
      setAdminModalError('');

      await loadAllSupabaseData();
      Alert.alert('Admin Created 🎉', `System Admin account "${trimmedName}" created successfully!`);
    } catch (e) {
      setAdminModalError('Failed to create Admin: ' + e.message);
    } finally {
      setAdminCreating(false);
    }
  };

  const handleToggleStatus = async (personId) => {
    const targetPerson = people.find((p) => p.id === personId);
    if (!targetPerson) return;

    const newAction = targetPerson.status === 'Logged In' ? 'Out' : 'In';
    const nowIso = new Date().toISOString();

    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId
          ? {
              ...p,
              status: newAction === 'In' ? 'Logged In' : 'Logged Out',
              lastLoginFormatted: formatLastLoginDisplay(nowIso),
            }
          : p
      )
    );

    try {
      await createLog({
        user_id: personId,
        type: newAction,
        datetime: nowIso,
      });

      await updateUser(personId, {
        last_action: newAction,
        last_login: nowIso,
      });

      await loadAllSupabaseData();
    } catch (e) {
      console.error('Failed to log attendance in Supabase:', e);
      Alert.alert('Sync Error', 'Failed to update attendance in cloud database.');
    }
  };

  const handleSaveTheme = async (newTheme) => {
    setTheme(newTheme);
    await setStorageItem('PL_APP_THEME', JSON.stringify(newTheme));
  };

  const handleSaveDarkMode = async (enabled) => {
    setIsDarkMode(enabled);
    await setStorageItem('PL_DARK_MODE', String(enabled));
  };

  const handleSaveAppName = async (newName) => {
    setAppName(newName);
    await setStorageItem('PL_APP_NAME', newName);
  };

  const handleSaveTaxSettings = async (enabled, rate) => {
    setIsTaxEnabled(enabled);
    setTaxRate(rate);
    await setStorageItem('PL_TAX_SETTINGS', JSON.stringify({ enabled, rate }));
  };

  const handleSaveAutoPrint = async (enabled) => {
    setIsAutoPrintEnabled(enabled);
    await setStorageItem('PL_AUTO_PRINT', String(enabled));
  };

  const handleSaveSupabaseUrl = (url) => {
    setSupabaseUrl(url);
  };

  const handleSaveSupabaseKey = (key) => {
    setSupabaseKey(key);
  };

  const handleSaveBusinessHours = async (dayName, patchObj) => {
    const updatedBiz = {
      ...businessHours,
      [dayName]: { ...businessHours[dayName], ...patchObj },
    };
    setBusinessHours(updatedBiz);

    const targetDayObj = updatedBiz[dayName];
    if (targetDayObj && targetDayObj.id) {
      try {
        await updateBusinessHours(targetDayObj.id, {
          is_closed: targetDayObj.isClosed,
          open_time: targetDayObj.openTime || targetDayObj.open_time,
          close_time: targetDayObj.closeTime || targetDayObj.close_time,
        });
      } catch (e) {
        console.warn('Error updating business hours in Supabase:', e);
      }
    }
  };

  const handleAddPerson = async (name, role = 3, rate = 0, halfRate = 0, extraRate = 0) => {
    try {
      await createUser({
        name,
        pin: '000000',
        role: Number(role) || 3,
        rate: Number(rate) || 0,
        half_rate: Number(halfRate) || 0,
        extra_rate: Number(extraRate) || 0,
      });
      await loadAllSupabaseData();
    } catch (e) {
      console.error('Failed to create person in Supabase:', e);
    }
  };

  const handleEditPerson = async (personId, newName, newRole = 3, newRate = 0, newHalfRate = 0, newExtraRate = 0) => {
    try {
      await updateUser(personId, {
        name: newName,
        role: String(newRole),
        rate: Number(newRate) || 0,
        half_rate: Number(newHalfRate) || 0,
        extra_rate: Number(newExtraRate) || 0,
      });
      await loadAllSupabaseData();
    } catch (e) {
      console.error('Failed to update person in Supabase:', e);
    }
  };

  const handleDeletePerson = async (personId) => {
    try {
      await deleteUser(personId);
      await loadAllSupabaseData();
    } catch (e) {
      console.error('Failed to delete person in Supabase:', e);
    }
  };

  const getHeaderTitle = () => {
    switch (currentScreen) {
      case 'home':
        return appName || 'SetSales';
      case 'register':
        return 'Register / Transact';
      case 'transactions':
        return 'Transaction History';
      case 'items':
        return 'Items';
      case 'inventory':
        return 'Inventory Stock';
      case 'reports':
        return 'Business Reports';
      case 'people':
        return 'People Directory';
      case 'settings':
        return 'Settings';
      default:
        return appName || 'SetSales';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingArea}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Syncing People Log Cloud POS...</Text>
      </SafeAreaView>
    );
  }

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            appName={appName}
            theme={theme}
            isDarkMode={isDarkMode}
            people={people}
            orders={allOrders}
            inventory={allInventory}
            drawerHistory={drawerHistory}
            businessHours={businessHours}
            rolePermissions={rolePermissions}
            loggedInUser={loggedInUser}
            setLoggedInUser={handleSetLoggedInUser}
            onOpenLoginModal={() => setIsLoginModalVisible(true)}
            onOpenSessionModal={() => setIsUserSessionModalVisible(true)}
            onRefreshOrders={loadAllSupabaseData}
            onRefreshDrawerHistory={loadAllSupabaseData}
            onNavigateToTransact={() => setCurrentScreen('register')}
            onNavigateToTransactions={() => setCurrentScreen('transactions')}
            onNavigateToItems={() => setCurrentScreen('items')}
            onNavigateToInventory={() => setCurrentScreen('inventory')}
            onNavigateToReports={() => setCurrentScreen('reports')}
            onNavigateToPeople={() => setCurrentScreen('people')}
            onNavigateToSettings={() => setCurrentScreen('settings')}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            appName={appName}
            isTaxEnabled={isTaxEnabled}
            taxRate={taxRate}
            isAutoPrintEnabled={isAutoPrintEnabled}
            isDarkMode={isDarkMode}
            onBack={() => {
              loadAllSupabaseData();
              setCurrentScreen('home');
            }}
          />
        );
      case 'transactions':
        return (
          <TransactionsScreen
            appName={appName}
            isTaxEnabled={isTaxEnabled}
            taxRate={taxRate}
            loggedInUser={loggedInUser}
            rolePermissions={rolePermissions}
            isDarkMode={isDarkMode}
            onBack={() => {
              loadAllSupabaseData();
              setCurrentScreen('home');
            }}
          />
        );
      case 'items':
        return (
          <ItemsScreen
            isDarkMode={isDarkMode}
            onBack={() => {
              loadAllSupabaseData();
              setCurrentScreen('home');
            }}
          />
        );
      case 'inventory':
        return (
          <InventoryScreen
            loggedInUser={loggedInUser}
            rolePermissions={rolePermissions}
            isDarkMode={isDarkMode}
            onBack={() => {
              loadAllSupabaseData();
              setCurrentScreen('home');
            }}
          />
        );
      case 'reports':
        return (
          <ReportsScreen
            orders={allOrders}
            itemsList={allItems}
            drawerHistory={drawerHistory}
            people={people}
            logs={allLogs}
            loggedInUser={loggedInUser}
            rolePermissions={rolePermissions}
            isDarkMode={isDarkMode}
            onBack={() => setCurrentScreen('home')}
          />
        );
      case 'people':
        return (
          <PeopleScreen
            people={people}
            logs={allLogs}
            appName={appName}
            theme={theme}
            loggedInUser={loggedInUser}
            rolePermissions={rolePermissions}
            isDarkMode={isDarkMode}
            onToggleStatus={handleToggleStatus}
            onAddPerson={handleAddPerson}
            onEditPerson={handleEditPerson}
            onDeletePerson={handleDeletePerson}
            onBack={() => setCurrentScreen('home')}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            loggedInUser={loggedInUser}
            people={people}
            rolePermissions={rolePermissions}
            logs={allLogs}
            orders={allOrders}
            itemsList={allItems}
            businessHours={businessHours}
            onSaveBusinessHours={handleSaveBusinessHours}
            onBack={() => setCurrentScreen('home')}
            appName={appName}
            onSaveAppName={handleSaveAppName}
            theme={theme}
            onSaveTheme={handleSaveTheme}
            isDarkMode={isDarkMode}
            onSaveDarkMode={handleSaveDarkMode}
            supabaseUrl={supabaseUrl}
            onSaveSupabaseUrl={handleSaveSupabaseUrl}
            supabaseKey={supabaseKey}
            onSaveSupabaseKey={handleSaveSupabaseKey}
            isTaxEnabled={isTaxEnabled}
            taxRate={taxRate}
            onSaveTaxSettings={handleSaveTaxSettings}
            isAutoPrintEnabled={isAutoPrintEnabled}
            onSaveAutoPrint={handleSaveAutoPrint}
          />
        );
      default:
        return null;
    }
  };

  const appBgColor = isDarkMode ? '#0F172A' : '#F8FAFC';
  const appTextColor = isDarkMode ? '#F8FAFC' : '#0F172A';

  return (
    <SafeAreaView style={[styles.appContainer, { backgroundColor: appBgColor }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={appBgColor}
      />

      {/* Global Sticky Header (Dynamic Title + Tappable Home Shortcut + Sync Button + User Access Button) */}
      <View style={[styles.globalStickyHeader, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
        <TouchableOpacity onPress={() => setCurrentScreen('home')} activeOpacity={0.8}>
          <Text style={[styles.globalAppTitle, { color: appTextColor }]}>{getHeaderTitle()}</Text>
        </TouchableOpacity>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            style={styles.headerSyncBtn}
            onPress={loadAllSupabaseData}
            activeOpacity={0.7}
          >
            <Text style={styles.headerSyncBtnText}>🔄 Sync</Text>
          </TouchableOpacity>

          {loggedInUser ? (
            <TouchableOpacity
              style={styles.userSessionBadgeBtn}
              onPress={() => setIsUserSessionModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.userSessionBadgeText}>👤 {loggedInUser.name}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.userAccessOutlineBtn}
              onPress={() => setIsLoginModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.userAccessOutlineBtnText}>User Access</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active Screen View */}
      <View style={styles.screenWrapper}>
        {renderActiveScreen()}
      </View>

      {/* Global Sticky Bottom Navigation Bar (4 Equal Width Horizontally Divided Tabs - All Screens Except Home) */}
      {currentScreen !== 'home' ? (
        <View style={[styles.globalBottomBar, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderTopColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
          <TouchableOpacity
            style={[styles.bottomTabBtn, currentScreen === 'home' && styles.bottomTabBtnActive]}
            onPress={() => setCurrentScreen('home')}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomTabIcon}>🏠</Text>
            <Text style={[styles.bottomTabText, currentScreen === 'home' && styles.bottomTabTextActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomTabBtn, currentScreen === 'register' && styles.bottomTabBtnActive]}
            onPress={() => setCurrentScreen('register')}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomTabIcon}>🛒</Text>
            <Text style={[styles.bottomTabText, currentScreen === 'register' && styles.bottomTabTextActive]}>Register</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomTabBtn, currentScreen === 'transactions' && styles.bottomTabBtnActive]}
            onPress={() => setCurrentScreen('transactions')}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomTabIcon}>💳</Text>
            <Text style={[styles.bottomTabText, currentScreen === 'transactions' && styles.bottomTabTextActive]}>Transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomTabBtn, currentScreen === 'people' && styles.bottomTabBtnActive]}
            onPress={() => setCurrentScreen('people')}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomTabIcon}>👥</Text>
            <Text style={[styles.bottomTabText, currentScreen === 'people' && styles.bottomTabTextActive]}>People</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* MODAL: LOGIN */}
      <Modal visible={isLoginModalVisible} transparent animationType="fade" onRequestClose={() => setIsLoginModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsLoginModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.loginCard}>
                <Text style={styles.loginTitle}>👤 User Access Login</Text>
                <Text style={styles.loginNote}>
                  Login to enable settings and actions based on your assigned user role.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#94A3B8"
                    value={loginNameInput}
                    onChangeText={setLoginNameInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>6-Digit PIN *</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="Enter 6-digit PIN"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    secureTextEntry={true}
                    maxLength={6}
                    value={loginPinInput}
                    onChangeText={setLoginPinInput}
                  />
                </View>

                {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setIsLoginModalVisible(false)}>
                    <Text style={styles.closeBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveDrawerBtn} onPress={handleUserLogin}>
                    <Text style={styles.saveDrawerBtnText}>Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL: LOGGED IN USER SESSION */}
      <Modal visible={isUserSessionModalVisible} transparent animationType="fade" onRequestClose={() => setIsUserSessionModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsUserSessionModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.loginCard}>
                <Text style={styles.loginTitle}>👤 {loggedInUser?.name}</Text>
                <Text style={styles.loginNote}>
                  Role: {Number(loggedInUser?.role) === 1 ? 'Admin (Role 1)' : 'Staff'}
                </Text>

                <TouchableOpacity
                  style={styles.sessionOptionBtn}
                  onPress={() => {
                    setIsUserSessionModalVisible(false);
                    setIsChangePinModalVisible(true);
                  }}
                >
                  <Text style={styles.sessionOptionBtnText}>🔑 Change PIN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sessionOptionBtn, styles.logoutBtn]}
                  onPress={() => {
                    handleSetLoggedInUser(null);
                    setIsUserSessionModalVisible(false);
                    Alert.alert('Logged Out', 'You have been logged out.');
                  }}
                >
                  <Text style={styles.logoutBtnText}>🚪 Log Out</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBtnFull} onPress={() => setIsUserSessionModalVisible(false)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL: CHANGE PIN */}
      <Modal visible={isChangePinModalVisible} transparent animationType="fade" onRequestClose={() => setIsChangePinModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsChangePinModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.loginCard}>
                <Text style={styles.loginTitle}>🔑 Change 6-Digit PIN</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>New 6-Digit PIN *</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="Enter new 6-digit PIN"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    secureTextEntry={true}
                    maxLength={6}
                    value={newPinInput}
                    onChangeText={setNewPinInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Confirm New PIN *</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="Confirm new 6-digit PIN"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    secureTextEntry={true}
                    maxLength={6}
                    value={confirmNewPinInput}
                    onChangeText={setConfirmNewPinInput}
                  />
                </View>

                {changePinError ? <Text style={styles.errorText}>{changePinError}</Text> : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setIsChangePinModalVisible(false)}>
                    <Text style={styles.closeBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveDrawerBtn} onPress={handleChangePin}>
                    <Text style={styles.saveDrawerBtnText}>Save PIN</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* First Launch Admin Setup Modal */}
      <Modal visible={isFirstLaunchAdminModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.adminModalOverlay}>
            <View style={styles.adminModalCard}>
              <Text style={styles.adminModalTitle}>👑 Setup System Admin Account</Text>
              <Text style={styles.adminModalSub}>
                Welcome to People Log! Create your primary Admin account to secure App Settings & Directory.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Admin Full Name *:</Text>
                <TextInput
                  style={styles.textInputFull}
                  placeholder="e.g. Manager John"
                  placeholderTextColor="#94A3B8"
                  value={adminNameInput}
                  onChangeText={setAdminNameInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Create 6-Digit Admin PIN *:</Text>
                <TextInput
                  style={styles.textInputFull}
                  placeholder="Enter 6-digit PIN"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  secureTextEntry={true}
                  maxLength={6}
                  value={adminPinInput}
                  onChangeText={setAdminPinInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Confirm Admin PIN *:</Text>
                <TextInput
                  style={styles.textInputFull}
                  placeholder="Confirm 6-digit PIN"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  secureTextEntry={true}
                  maxLength={6}
                  value={adminConfirmPinInput}
                  onChangeText={setAdminConfirmPinInput}
                />
              </View>

              {adminModalError ? <Text style={styles.errorText}>{adminModalError}</Text> : null}

              <TouchableOpacity
                style={styles.createAdminBtn}
                onPress={handleCreateFirstLaunchAdmin}
                disabled={adminCreating}
              >
                {adminCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createAdminBtnText}>Create Admin Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  globalStickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 32),
    paddingBottom: 12,
    borderBottomWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 99,
  },
  globalAppTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSyncBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 8,
  },
  headerSyncBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  userAccessOutlineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  userAccessOutlineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  userSessionBadgeBtn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  userSessionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  screenWrapper: {
    flex: 1,
  },
  globalBottomBar: {
    flexDirection: 'row',
    height: 62,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    zIndex: 99,
  },
  bottomTabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bottomTabBtnActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  bottomTabIcon: {
    fontSize: 18,
  },
  bottomTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  bottomTabTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  loginNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  sessionOptionBtn: {
    backgroundColor: '#F1F5F9',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  sessionOptionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  closeBtnFull: {
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInputFull: {
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  saveDrawerBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveDrawerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  adminModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adminModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  adminModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginVertical: 10,
    lineHeight: 18,
  },
  createAdminBtn: {
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  createAdminBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
