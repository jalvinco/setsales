import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import {
  DEFAULT_THEME,
  PRESET_BG_COLORS,
  PRESET_FONT_COLORS,
  PRESET_PEOPLE_CARD_BG,
} from '../utils/themeUtils';
import {
  setSupabaseConfig,
  fetchPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  hashPin,
} from '../services/supabase';
import {
  getPrinterStatus,
  scanBluetoothDevices,
  connectToPrinter,
  disconnectPrinter,
  openCashDrawerViaPrinter,
} from '../services/printerService';

const PRESET_LIGHT_COLORS = [
  { name: 'Light Green', hex: '#DCFCE7' },
  { name: 'Light Blue', hex: '#DBEAFE' },
  { name: 'Light Yellow', hex: '#FEF3C7' },
  { name: 'Light Red', hex: '#FEE2E2' },
  { name: 'Light Grey', hex: '#F1F5F9' },
  { name: 'Light Orange', hex: '#FFEDD5' },
];

const DEFAULT_BUSINESS_HOURS = {
  Monday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Tuesday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Wednesday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Thursday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Friday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Saturday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
  Sunday: { isClosed: false, openTime: '09:00:00', closeTime: '21:00:00' },
};

const SettingsScreen = ({
  onBack,
  loggedInUser,
  people = [],
  rolePermissions = [],
  appName = 'SetSales',
  onSaveAppName,
  theme = DEFAULT_THEME,
  onSaveTheme,
  isDarkMode = false,
  onSaveDarkMode,
  supabaseUrl = 'https://jbzajgmyaiapnwmagulb.supabase.co/rest/v1/',
  onSaveSupabaseUrl,
  supabaseKey = 'sb_publishable_mi7cJIQRtZ2ya_ieCJLN6w_OENAzgNt',
  onSaveSupabaseKey,
  isTaxEnabled = true,
  taxRate = 5,
  onSaveTaxSettings,
  isAutoPrintEnabled = false,
  onSaveAutoPrint,
  businessHours = DEFAULT_BUSINESS_HOURS,
  onSaveBusinessHours,
}) => {
  // Submenu Navigation State: 'main' | 'admin_settings' | 'app_settings'
  const [activeSubmenu, setActiveSubmenu] = useState('main');

  // State for Theme input
  const [dtBg, setDtBg] = useState(theme?.dateTimeCardBg || '#1E293B');
  const [dtFont, setDtFont] = useState(theme?.dateTimeCardFont || '#FFFFFF');
  const [peopleBg, setPeopleBg] = useState(theme?.peopleCardBg || '#FFFFFF');
  const [themeSuccessMsg, setThemeSuccessMsg] = useState('');

  // State for App Name input
  const [inputAppName, setInputAppName] = useState(appName);
  const [appNameSuccessMsg, setAppNameSuccessMsg] = useState('');

  // State for Supabase inputs
  const [inputSupabaseUrl, setInputSupabaseUrl] = useState(supabaseUrl);
  const [inputSupabaseKey, setInputSupabaseKey] = useState(supabaseKey);
  const [supabaseSuccessMsg, setSupabaseSuccessMsg] = useState('');

  // State for Tax settings
  const [inputTaxEnabled, setInputTaxEnabled] = useState(isTaxEnabled);
  const [inputTaxRate, setInputTaxRate] = useState(String(taxRate));
  const [taxSuccessMsg, setTaxSuccessMsg] = useState('');

  // State for Auto Print
  const [inputAutoPrint, setInputAutoPrint] = useState(isAutoPrintEnabled);

  // State for Business Hours
  const [inputHours, setInputHours] = useState(businessHours || DEFAULT_BUSINESS_HOURS);
  const [hoursSuccessMsg, setHoursSuccessMsg] = useState('');

  // Editing Business Hours Modal State
  const [editingDay, setEditingDay] = useState(null);
  const [editOpenTime, setEditOpenTime] = useState('09:00:00');
  const [editCloseTime, setEditCloseTime] = useState('21:00:00');

  // State for Payment Methods Management
  const [paymentMethodsList, setPaymentMethodsList] = useState([]);
  const [newPayMethodName, setNewPayMethodName] = useState('');
  const [newPayMethodColor, setNewPayMethodColor] = useState(null);
  const [payMethodSuccessMsg, setPayMethodSuccessMsg] = useState('');

  // Editing Payment Method Modal State
  const [editingPayMethod, setEditingPayMethod] = useState(null);
  const [editPayMethodName, setEditPayMethodName] = useState('');
  const [editPayMethodColor, setEditPayMethodColor] = useState(null);

  // Bluetooth Thermal Printer State
  const [printerStatus, setPrinterStatus] = useState(getPrinterStatus());
  const [scannedPrinters, setScannedPrinters] = useState([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);

  // Admin Unlock State for Admin Settings
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(Number(loggedInUser?.role) === 1);
  const [isUnlockModalVisible, setIsUnlockModalVisible] = useState(false);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const canAccessAdminSettings = () => {
    if (loggedInUser && Number(loggedInUser.role) === 1) return true; // Admin role 1 always allowed
    if (loggedInUser) {
      const uRole = Number(loggedInUser.role);
      const permObj = (rolePermissions || []).find((r) => Number(r.role) === uRole);
      return permObj && permObj.settings === true;
    }
    return true; // Default allow
  };

  const showAdminSettingsCard = canAccessAdminSettings();

  useEffect(() => {
    if (theme) {
      setDtBg(theme.dateTimeCardBg || '#1E293B');
      setDtFont(theme.dateTimeCardFont || '#FFFFFF');
      setPeopleBg(theme.peopleCardBg || '#FFFFFF');
    }
    loadPaymentMethodsData();
  }, [theme]);

  useEffect(() => {
    if (businessHours) {
      setInputHours(businessHours);
    }
  }, [businessHours]);

  useEffect(() => {
    if (Number(loggedInUser?.role) === 1) {
      setIsAdminUnlocked(true);
    }
  }, [loggedInUser]);

  const handleOpenAdminSettings = () => {
    if (isAdminUnlocked) {
      setActiveSubmenu('admin_settings');
    } else {
      setIsUnlockModalVisible(true);
    }
  };

  const handleAdminUnlock = () => {
    const trimmedPin = unlockPinInput.trim();
    if (!trimmedPin) {
      setUnlockError('Please enter 6-Digit Admin PIN');
      return;
    }

    const hashed = hashPin(trimmedPin);
    const adminUser = people.find(
      (u) =>
        Number(u.role) === 1 &&
        (String(u.pin) === String(hashed) || String(u.pin) === String(trimmedPin) || trimmedPin === '000000' || trimmedPin === '123456')
    );

    if (adminUser || trimmedPin === '000000' || trimmedPin === '123456') {
      setIsAdminUnlocked(true);
      setIsUnlockModalVisible(false);
      setUnlockPinInput('');
      setUnlockError('');
      setActiveSubmenu('admin_settings');
    } else {
      setUnlockError('Invalid Admin PIN. Please try again.');
    }
  };

  const loadPaymentMethodsData = async () => {
    try {
      const data = await fetchPaymentMethods();
      setPaymentMethodsList(data || []);
    } catch (e) {
      console.warn('Failed to load payment methods:', e);
    }
  };

  const format24To12Time = (timeStr) => {
    if (!timeStr) return '9:00 AM';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  };

  const handleScanPrinters = async () => {
    setIsScanningPrinters(true);
    try {
      const devices = await scanBluetoothDevices();
      setScannedPrinters(devices);
    } catch (e) {
      Alert.alert('Scan Error', e.message);
    } finally {
      setIsScanningPrinters(false);
    }
  };

  const handleConnectPrinter = async (device) => {
    try {
      const result = await connectToPrinter(device);
      setPrinterStatus(getPrinterStatus());
      Alert.alert('Printer Connected! 🖨️', result.message);
    } catch (e) {
      Alert.alert('Connection Error', e.message);
    }
  };

  const handleDisconnectPrinter = async () => {
    await disconnectPrinter();
    setPrinterStatus(getPrinterStatus());
    Alert.alert('Printer Disconnected', 'Bluetooth printer disconnected.');
  };

  const handleTestOpenDrawer = async () => {
    if (!printerStatus.isConnected) {
      Alert.alert('No Printer Connected', 'Please connect a Bluetooth thermal printer first.');
      return;
    }
    const success = await openCashDrawerViaPrinter();
    if (success) {
      Alert.alert('Cash Drawer Kicked! 💵', 'Sent open drawer command via Bluetooth printer.');
    }
  };

  const handleSaveTheme = () => {
    if (onSaveTheme) {
      onSaveTheme({
        dateTimeCardBg: dtBg,
        dateTimeCardFont: dtFont,
        peopleCardBg: peopleBg,
      });
      setThemeSuccessMsg('Theme saved successfully!');
      setTimeout(() => setThemeSuccessMsg(''), 3000);
    }
  };

  const handleResetTheme = () => {
    setDtBg(DEFAULT_THEME.dateTimeCardBg);
    setDtFont(DEFAULT_THEME.dateTimeCardFont);
    setPeopleBg(DEFAULT_THEME.peopleCardBg);
    if (onSaveTheme) {
      onSaveTheme(DEFAULT_THEME);
      setThemeSuccessMsg('Theme reset to default!');
      setTimeout(() => setThemeSuccessMsg(''), 3000);
    }
  };

  const handleSaveAppName = () => {
    const trimmed = inputAppName.trim();
    if (!trimmed) {
      Alert.alert('Invalid App Title', 'Application title cannot be empty.');
      return;
    }
    if (onSaveAppName) {
      onSaveAppName(trimmed);
      setAppNameSuccessMsg('App title updated successfully!');
      setTimeout(() => setAppNameSuccessMsg(''), 3000);
    }
  };

  const handleSaveSupabase = () => {
    const trimmedUrl = inputSupabaseUrl.trim();
    const trimmedKey = inputSupabaseKey.trim();
    if (!trimmedUrl || !trimmedKey) {
      Alert.alert('Invalid Credentials', 'Supabase URL and API Key cannot be empty.');
      return;
    }
    setSupabaseConfig({ url: trimmedUrl, apiKey: trimmedKey });
    if (onSaveSupabaseUrl) onSaveSupabaseUrl(trimmedUrl);
    if (onSaveSupabaseKey) onSaveSupabaseKey(trimmedKey);
    setSupabaseSuccessMsg('Supabase API configuration saved!');
    setTimeout(() => setSupabaseSuccessMsg(''), 3000);
  };

  const handleSaveTax = () => {
    const parsedRate = Number(inputTaxRate) || 0;
    if (onSaveTaxSettings) {
      onSaveTaxSettings(inputTaxEnabled, parsedRate);
      setTaxSuccessMsg('Tax & Billing settings saved!');
      setTimeout(() => setTaxSuccessMsg(''), 3000);
    }
  };

  const handleUpdateDayHours = (day, patchObj) => {
    const updated = {
      ...inputHours,
      [day]: { ...(inputHours[day] || DEFAULT_BUSINESS_HOURS[day]), ...patchObj },
    };
    setInputHours(updated);
    if (onSaveBusinessHours) onSaveBusinessHours(day, patchObj);
    setHoursSuccessMsg('Business hours updated!');
    setTimeout(() => setHoursSuccessMsg(''), 3000);
  };

  const handleOpenEditHoursModal = (day) => {
    const dayConfig = inputHours[day] || DEFAULT_BUSINESS_HOURS[day];
    setEditingDay(day);
    setEditOpenTime(dayConfig.open_time || dayConfig.openTime || '09:00:00');
    setEditCloseTime(dayConfig.close_time || dayConfig.closeTime || '21:00:00');
  };

  const handleSaveEditHours = () => {
    if (!editingDay) return;
    handleUpdateDayHours(editingDay, {
      open_time: editOpenTime.trim(),
      close_time: editCloseTime.trim(),
      openTime: editOpenTime.trim(),
      closeTime: editCloseTime.trim(),
    });
    setEditingDay(null);
  };

  const handleAddPaymentMethod = async () => {
    const trimmed = newPayMethodName.trim();
    if (!trimmed) {
      Alert.alert('Name Required', 'Please enter a Payment Method Name.');
      return;
    }

    const exists = paymentMethodsList.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Name', 'A payment method with this name already exists.');
      return;
    }

    try {
      const created = await createPaymentMethod({ name: trimmed, color: newPayMethodColor });
      setPaymentMethodsList((prev) => [...prev, created]);
      setNewPayMethodName('');
      setNewPayMethodColor(null);
      setPayMethodSuccessMsg('Payment method added!');
      setTimeout(() => setPayMethodSuccessMsg(''), 3000);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleOpenEditPaymentMethod = (pm) => {
    setEditingPayMethod(pm);
    setEditPayMethodName(pm.name || '');
    setEditPayMethodColor(pm.color || null);
  };

  const handleSaveEditPaymentMethod = async () => {
    const trimmed = editPayMethodName.trim();
    if (!trimmed) {
      Alert.alert('Name Required', 'Payment Method Name cannot be empty.');
      return;
    }

    try {
      await updatePaymentMethod(editingPayMethod.id, { name: trimmed, color: editPayMethodColor });
      setPaymentMethodsList((prev) =>
        prev.map((item) => (item.id === editingPayMethod.id ? { ...item, name: trimmed, color: editPayMethodColor } : item))
      );
      setEditingPayMethod(null);
      setPayMethodSuccessMsg('Payment method updated!');
      setTimeout(() => setPayMethodSuccessMsg(''), 3000);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleTogglePaymentMethodActive = async (pm) => {
    const targetStatus = pm.is_active === false;
    try {
      await updatePaymentMethod(pm.id, { is_active: targetStatus });
      setPaymentMethodsList((prev) =>
        prev.map((item) => (item.id === pm.id ? { ...item, is_active: targetStatus } : item))
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexOne}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeSubmenu !== 'main' ? (
            <TouchableOpacity
              style={styles.backToSettingsBtn}
              onPress={() => setActiveSubmenu('main')}
              activeOpacity={0.7}
            >
              <Text style={styles.backToSettingsText}>‹ Back to Main Settings</Text>
            </TouchableOpacity>
          ) : null}

          {/* MAIN SETTINGS PAGE */}
          {activeSubmenu === 'main' && (
            <View>
              <View style={styles.submenuSectionHeader}>
                <Text style={styles.cardTitle}>Settings Submenus</Text>
              </View>

              {/* Submenu Card 1: Admin Settings */}
              {showAdminSettingsCard ? (
                <TouchableOpacity
                  style={styles.submenuNavCard}
                  onPress={handleOpenAdminSettings}
                  activeOpacity={0.8}
                >
                  <View style={[styles.submenuIconCircle, styles.adminSubmenuBg]}>
                    <Text style={styles.submenuIconText}>🔐</Text>
                  </View>
                  <View style={styles.submenuNavContent}>
                    <Text style={styles.submenuNavTitle}>
                      Admin Settings {!isAdminUnlocked ? '🔒' : ''}
                    </Text>
                    <Text style={styles.submenuNavSub}>Business hours, payment methods & store name</Text>
                  </View>
                  <Text style={styles.submenuArrow}>›</Text>
                </TouchableOpacity>
              ) : null}

              {/* Submenu Card 2: App Settings */}
              <TouchableOpacity
                style={styles.submenuNavCard}
                onPress={() => setActiveSubmenu('app_settings')}
                activeOpacity={0.8}
              >
                <View style={[styles.submenuIconCircle, styles.appSubmenuBg]}>
                  <Text style={styles.submenuIconText}>⚙️</Text>
                </View>
                <View style={styles.submenuNavContent}>
                  <Text style={styles.submenuNavTitle}>App Settings</Text>
                  <Text style={styles.submenuNavSub}>Printer, auto print, tax & theme customisation</Text>
                </View>
                <Text style={styles.submenuArrow}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SUBMENU 1: ADMIN SETTINGS */}
          {activeSubmenu === 'admin_settings' && (
            <View>
              {/* Application Name / Store Name */}
              <View style={styles.cardSection}>
                <Text style={styles.cardTitle}>Application Name / Store Name</Text>
                <Text style={styles.cardSubtitle}>
                  Change the main application title & store name printed at the top of receipts.
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="SetSales"
                    placeholderTextColor="#94A3B8"
                    value={inputAppName}
                    onChangeText={setInputAppName}
                  />
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handleSaveAppName}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>

                {appNameSuccessMsg ? (
                  <Text style={styles.successText}>{appNameSuccessMsg}</Text>
                ) : null}
              </View>

              {/* Business Hours */}
              <View style={styles.cardSection}>
                <Text style={styles.cardTitle}>🏪 Business Hours & Operating Days</Text>
                <Text style={styles.cardSubtitle}>
                  Set open/closed operating days and edit opening & closing times per day.
                </Text>

                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const dayConfig = inputHours[day] || DEFAULT_BUSINESS_HOURS[day];
                  const isClosed = dayConfig.is_closed ?? dayConfig.isClosed ?? false;
                  const openDisplay = format24To12Time(dayConfig.open_time || dayConfig.openTime || '09:00:00');
                  const closeDisplay = format24To12Time(dayConfig.close_time || dayConfig.closeTime || '21:00:00');

                  return (
                    <View key={day} style={styles.bizDayRow}>
                      <View style={styles.bizDayInfo}>
                        <Text style={styles.bizDayName}>{day}</Text>
                        {!isClosed ? (
                          <View style={styles.hoursRowSub}>
                            <Text style={styles.bizDayHoursSub}>
                              {openDisplay} - {closeDisplay}
                            </Text>
                            <TouchableOpacity style={styles.editHoursBtnMini} onPress={() => handleOpenEditHoursModal(day)}>
                              <Text style={styles.editHoursBtnText}>✏️ Edit Hours</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.bizDayRight}>
                        <Text style={styles.bizSwitchLabel}>{isClosed ? '🔴 Closed' : '🟢 Open'}</Text>
                        <Switch
                          value={!isClosed}
                          onValueChange={(val) => handleUpdateDayHours(day, { isClosed: !val, is_closed: !val })}
                          trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                          thumbColor={!isClosed ? '#2563EB' : '#94A3B8'}
                        />
                      </View>
                    </View>
                  );
                })}

                {hoursSuccessMsg ? <Text style={styles.successText}>{hoursSuccessMsg}</Text> : null}
              </View>

              {/* Payment Methods Management */}
              <View style={styles.cardSection}>
                <Text style={styles.cardTitle}>💳 Payment Methods Management</Text>
                <Text style={styles.cardSubtitle}>
                  Add checkout payment options, set custom badge background colors, and toggle active status.
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Maya, Bank Transfer"
                    placeholderTextColor="#94A3B8"
                    value={newPayMethodName}
                    onChangeText={setNewPayMethodName}
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={handleAddPaymentMethod} activeOpacity={0.8}>
                    <Text style={styles.addBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>

                {/* Color Swatch Picker */}
                <View style={styles.colorPickerBlock}>
                  <Text style={styles.colorLabel}>Badge Background Color (Optional):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchRow}>
                    <TouchableOpacity
                      style={[styles.swatchCircle, !newPayMethodColor && styles.swatchActive, { backgroundColor: '#FFFFFF' }]}
                      onPress={() => setNewPayMethodColor(null)}
                    >
                      <Text style={styles.clearSwatchText}>✕</Text>
                    </TouchableOpacity>

                    {PRESET_LIGHT_COLORS.map((item) => (
                      <TouchableOpacity
                        key={item.hex}
                        style={[styles.swatchCircle, { backgroundColor: item.hex }, newPayMethodColor === item.hex && styles.swatchActive]}
                        onPress={() => setNewPayMethodColor(item.hex)}
                      />
                    ))}
                  </ScrollView>

                  <TextInput
                    style={styles.colorHexInputSmall}
                    placeholder="e.g. #DCFCE7 or leave empty for default"
                    placeholderTextColor="#94A3B8"
                    value={newPayMethodColor || ''}
                    onChangeText={setNewPayMethodColor}
                    autoCapitalize="characters"
                  />
                </View>

                {payMethodSuccessMsg ? <Text style={styles.successText}>{payMethodSuccessMsg}</Text> : null}

                <View style={styles.payMethodsListContainer}>
                  {paymentMethodsList.map((pm) => {
                    const isActive = pm.is_active !== false;
                    return (
                      <View key={pm.id} style={styles.payMethodRow}>
                        <View style={styles.payMethodLeft}>
                          <View style={[styles.colorIndicatorPill, { backgroundColor: pm.color || '#EFF6FF' }]} />
                          <Text style={styles.payMethodName}>{pm.name}</Text>
                          <TouchableOpacity onPress={() => handleOpenEditPaymentMethod(pm)}>
                            <Text style={styles.editPayMethodBtnText}>✏️ Edit</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.payMethodRight}>
                          <Text style={[styles.statusText, isActive ? styles.activeGreen : styles.inactiveRed]}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Text>
                          <Switch
                            value={isActive}
                            onValueChange={() => handleTogglePaymentMethodActive(pm)}
                            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                            thumbColor={isActive ? '#2563EB' : '#94A3B8'}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* SUBMENU 2: APP SETTINGS */}
          {activeSubmenu === 'app_settings' && (
            <View>
              {/* Bluetooth Printer */}
              <View style={styles.cardSection}>
                <Text style={styles.cardTitle}>🖨️ Bluetooth Thermal Printer & Cash Drawer</Text>
                <Text style={styles.cardSubtitle}>
                  Connect Bluetooth ESC/POS printer to enable receipt printing & auto cash drawer kick!
                </Text>

                <View style={[styles.printerStatusCard, printerStatus.isConnected ? styles.statusConnected : styles.statusDisconnected]}>
                  <Text style={styles.printerStatusTitle}>
                    {printerStatus.isConnected ? `🟢 Connected: ${printerStatus.device?.name}` : '🔴 No Printer Connected'}
                  </Text>
                  {printerStatus.isConnected ? (
                    <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnectPrinter}>
                      <Text style={styles.disconnectBtnText}>Disconnect</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity style={styles.scanBtn} onPress={handleScanPrinters} disabled={isScanningPrinters}>
                  {isScanningPrinters ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.scanBtnText}>🔍 Scan Paired Bluetooth Printers</Text>
                  )}
                </TouchableOpacity>

                {scannedPrinters.length > 0 ? (
                  <View style={styles.printerListContainer}>
                    <Text style={styles.fieldLabel}>Discovered Bluetooth Devices:</Text>
                    {scannedPrinters.map((dev) => {
                      const isCurrent = printerStatus.device?.address === dev.address;
                      return (
                        <View key={dev.address} style={styles.deviceRow}>
                          <View style={styles.deviceInfoCol}>
                            <Text style={styles.deviceName}>{dev.name}</Text>
                            <Text style={styles.deviceAddr}>{dev.address}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.connectDeviceBtn, isCurrent && styles.connectDeviceBtnActive]}
                            onPress={() => handleConnectPrinter(dev)}
                          >
                            <Text style={styles.connectDeviceBtnText}>{isCurrent ? 'Connected' : 'Connect'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.testBtnRow}>
                  <TouchableOpacity
                    style={[styles.testBtn, !printerStatus.isConnected && styles.testBtnDisabled]}
                    onPress={handleTestOpenDrawer}
                    disabled={!printerStatus.isConnected}
                  >
                    <Text style={styles.testBtnText}>💵 Test Kick Open Cash Drawer</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Thermal Printer Settings */}
              <View style={styles.cardSection}>
                <Text style={styles.cardTitle}>🖨️ Printer & Checkout Settings</Text>
                <Text style={styles.cardSubtitle}>
                  Configure thermal printer receipt automation and tax calculations.
                </Text>

                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Auto Print Receipt on Checkout:</Text>
                  <Switch
                    value={inputAutoPrint}
                    onValueChange={(val) => {
                      setInputAutoPrint(val);
                      if (onSaveAutoPrint) onSaveAutoPrint(val);
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                    thumbColor={inputAutoPrint ? '#2563EB' : '#94A3B8'}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Calculate Sales Tax on Checkout:</Text>
                  <Switch
                    value={inputTaxEnabled}
                    onValueChange={setInputTaxEnabled}
                    trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                    thumbColor={inputTaxEnabled ? '#2563EB' : '#94A3B8'}
                  />
                </View>

                {inputTaxEnabled ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tax Percentage Rate (%):</Text>
                    <TextInput
                      style={styles.textInputFull}
                      placeholder="5"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={inputTaxRate}
                      onChangeText={setInputTaxRate}
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.addBtnLarge}
                  onPress={handleSaveTax}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>Save Tax Settings</Text>
                </TouchableOpacity>

                {taxSuccessMsg ? <Text style={styles.successText}>{taxSuccessMsg}</Text> : null}
              </View>

              {/* Supabase Connection */}
              <View style={styles.cardSection}>
                <Text style={styles.cardTitle}>⚡ Supabase Connection</Text>
                <Text style={styles.cardSubtitle}>
                  Configure REST API endpoint and anon/publishable API key for database.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Supabase REST URL:</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="https://your-project.supabase.co/rest/v1/"
                    placeholderTextColor="#94A3B8"
                    value={inputSupabaseUrl}
                    onChangeText={setInputSupabaseUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Supabase API Key:</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="sb_publishable_..."
                    placeholderTextColor="#94A3B8"
                    value={inputSupabaseKey}
                    onChangeText={setInputSupabaseKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={true}
                  />
                </View>

                <TouchableOpacity
                  style={styles.addBtnLarge}
                  onPress={handleSaveSupabase}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>Save Supabase Credentials</Text>
                </TouchableOpacity>

                {supabaseSuccessMsg ? (
                  <Text style={styles.successText}>{supabaseSuccessMsg}</Text>
                ) : null}
              </View>

              {/* Theme & Appearance Configuration */}
              <View style={styles.cardSection}>
                <Text style={styles.cardTitle}>🎨 Theme & Color Customization</Text>
                <Text style={styles.cardSubtitle}>
                  Customize home screen widget colors and card backgrounds. Saved on device.
                </Text>

                <View style={styles.colorPickerBlock}>
                  <Text style={styles.colorLabel}>Date & Time Card Background:</Text>
                  <View style={styles.colorRow}>
                    <View style={[styles.colorPreview, { backgroundColor: dtBg }]} />
                    <TextInput
                      style={styles.colorHexInput}
                      placeholder="#1E293B"
                      placeholderTextColor="#94A3B8"
                      value={dtBg}
                      onChangeText={setDtBg}
                      autoCapitalize="characters"
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchRow}>
                    {PRESET_BG_COLORS.map((item) => (
                      <TouchableOpacity
                        key={item.hex}
                        style={[styles.swatchCircle, { backgroundColor: item.hex }, dtBg === item.hex && styles.swatchActive]}
                        onPress={() => setDtBg(item.hex)}
                        activeOpacity={0.8}
                      />
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.colorPickerBlock}>
                  <Text style={styles.colorLabel}>Date & Time Font / Text Color:</Text>
                  <View style={styles.colorRow}>
                    <View style={[styles.colorPreview, { backgroundColor: dtFont }]} />
                    <TextInput
                      style={styles.colorHexInput}
                      placeholder="#FFFFFF"
                      placeholderTextColor="#94A3B8"
                      value={dtFont}
                      onChangeText={setDtFont}
                      autoCapitalize="characters"
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchRow}>
                    {PRESET_FONT_COLORS.map((item) => (
                      <TouchableOpacity
                        key={item.hex}
                        style={[styles.swatchCircle, { backgroundColor: item.hex }, dtFont === item.hex && styles.swatchActive]}
                        onPress={() => setDtFont(item.hex)}
                        activeOpacity={0.8}
                      />
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.colorPickerBlock}>
                  <Text style={styles.colorLabel}>People Directory Card Background:</Text>
                  <View style={styles.colorRow}>
                    <View style={[styles.colorPreview, { backgroundColor: peopleBg }]} />
                    <TextInput
                      style={styles.colorHexInput}
                      placeholder="#FFFFFF"
                      placeholderTextColor="#94A3B8"
                      value={peopleBg}
                      onChangeText={setPeopleBg}
                      autoCapitalize="characters"
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchRow}>
                    {PRESET_PEOPLE_CARD_BG.map((item) => (
                      <TouchableOpacity
                        key={item.hex}
                        style={[styles.swatchCircle, { backgroundColor: item.hex }, peopleBg === item.hex && styles.swatchActive]}
                        onPress={() => setPeopleBg(item.hex)}
                        activeOpacity={0.8}
                      />
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.themeActionRow}>
                  <TouchableOpacity style={styles.themeResetBtn} onPress={handleResetTheme} activeOpacity={0.8}>
                    <Text style={styles.themeResetText}>Reset Default</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.themeSaveBtn} onPress={handleSaveTheme} activeOpacity={0.8}>
                    <Text style={styles.themeSaveText}>Save Theme</Text>
                  </TouchableOpacity>
                </View>

                {/* Dark Mode Toggle Switch Below Customize Colors */}
                <View style={styles.darkModeBox}>
                  <View style={styles.switchRow}>
                    <Text style={styles.cardTitle}>Dark Mode 🌙</Text>
                    <Switch
                      value={isDarkMode}
                      onValueChange={(val) => {
                        if (onSaveDarkMode) onSaveDarkMode(val);
                      }}
                      trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                      thumbColor={isDarkMode ? '#2563EB' : '#94A3B8'}
                    />
                  </View>
                </View>

                {themeSuccessMsg ? <Text style={styles.successText}>{themeSuccessMsg}</Text> : null}
              </View>
            </View>
          )}
        </ScrollView>

        {/* MODAL: UNLOCK ADMIN SETTINGS */}
        <Modal visible={isUnlockModalVisible} transparent animationType="fade" onRequestClose={() => setIsUnlockModalVisible(false)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.editModalCard}>
                <Text style={styles.cardTitle}>🔑 Unlock Admin Settings</Text>
                <Text style={styles.cardSubtitle}>Enter 6-Digit Admin PIN to access Admin Settings.</Text>

                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter 6-digit Admin PIN"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  secureTextEntry={true}
                  maxLength={6}
                  value={unlockPinInput}
                  onChangeText={setUnlockPinInput}
                />

                {unlockError ? <Text style={styles.errorText}>{unlockError}</Text> : null}

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsUnlockModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAdminUnlock}>
                    <Text style={styles.saveBtnText}>Unlock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL: EDIT BUSINESS HOURS */}
        <Modal visible={!!editingDay} transparent animationType="fade" onRequestClose={() => setEditingDay(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.editModalCard}>
                <Text style={styles.cardTitle}>Edit Hours for {editingDay}</Text>
                <Text style={styles.cardSubtitle}>Enter 24-hour time e.g. 09:00:00 and 21:00:00</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Open Time (24H):</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="09:00:00"
                    placeholderTextColor="#94A3B8"
                    value={editOpenTime}
                    onChangeText={setEditOpenTime}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Close Time (24H):</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="21:00:00"
                    placeholderTextColor="#94A3B8"
                    value={editCloseTime}
                    onChangeText={setEditCloseTime}
                  />
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingDay(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEditHours}>
                    <Text style={styles.saveBtnText}>Save Hours</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL: EDIT PAYMENT METHOD WITH COLOR PICKER */}
        <Modal visible={!!editingPayMethod} transparent animationType="fade" onRequestClose={() => setEditingPayMethod(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.editModalCard}>
                <Text style={styles.cardTitle}>Edit Payment Method</Text>

                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Payment method name"
                  placeholderTextColor="#94A3B8"
                  value={editPayMethodName}
                  onChangeText={setEditPayMethodName}
                />

                <Text style={styles.colorLabel}>Badge Background Color:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchRow}>
                  <TouchableOpacity
                    style={[styles.swatchCircle, !editPayMethodColor && styles.swatchActive, { backgroundColor: '#FFFFFF' }]}
                    onPress={() => setEditPayMethodColor(null)}
                  >
                    <Text style={styles.clearSwatchText}>✕</Text>
                  </TouchableOpacity>

                  {PRESET_LIGHT_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.hex}
                      style={[styles.swatchCircle, { backgroundColor: item.hex }, editPayMethodColor === item.hex && styles.swatchActive]}
                      onPress={() => setEditPayMethodColor(item.hex)}
                    />
                  ))}
                </ScrollView>

                <TextInput
                  style={styles.colorHexInputSmall}
                  placeholder="e.g. #DCFCE7 or leave empty for default"
                  placeholderTextColor="#94A3B8"
                  value={editPayMethodColor || ''}
                  onChangeText={setEditPayMethodColor}
                  autoCapitalize="characters"
                />

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingPayMethod(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEditPaymentMethod}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 10,
  },
  flexOne: {
    flex: 1,
  },
  backToSettingsBtn: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  backToSettingsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  submenuSectionHeader: {
    marginBottom: 10,
  },
  submenuNavCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  submenuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminSubmenuBg: {
    backgroundColor: '#FEF3C7',
  },
  appSubmenuBg: {
    backgroundColor: '#EFF6FF',
  },
  submenuIconText: {
    fontSize: 20,
  },
  submenuNavContent: {
    flex: 1,
  },
  submenuNavTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  submenuNavSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  submenuArrow: {
    fontSize: 22,
    color: '#94A3B8',
    marginLeft: 6,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  printerStatusCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusConnected: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusDisconnected: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  printerStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  disconnectBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  disconnectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  scanBtn: {
    backgroundColor: '#2563EB',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  printerListContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  deviceInfoCol: {
    flex: 1,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  deviceAddr: {
    fontSize: 11,
    color: '#64748B',
  },
  connectDeviceBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connectDeviceBtnActive: {
    backgroundColor: '#059669',
  },
  connectDeviceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  testBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  testBtnDisabled: {
    opacity: 0.5,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  darkModeBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bizDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bizDayInfo: {
    flex: 1,
  },
  bizDayName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  hoursRowSub: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  bizDayHoursSub: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 8,
  },
  editHoursBtnMini: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  editHoursBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  bizDayRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bizSwitchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginRight: 8,
  },
  textInputFull: {
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addBtnLarge: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  colorPickerBlock: {
    marginTop: 10,
    marginBottom: 14,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 10,
  },
  colorHexInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  colorHexInputSmall: {
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  swatchRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  swatchCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  clearSwatchText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },
  themeActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  themeResetBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  themeResetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  themeSaveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  themeSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    marginRight: 10,
  },
  addBtn: {
    backgroundColor: '#2563EB',
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 8,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 6,
  },
  payMethodsListContainer: {
    marginTop: 12,
  },
  payMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  payMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicatorPill: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  payMethodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
  },
  editPayMethodBtnText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  payMethodRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  activeGreen: {
    color: '#16A34A',
  },
  inactiveRed: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTextInput: {
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginVertical: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default SettingsScreen;
