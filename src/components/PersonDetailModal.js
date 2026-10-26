import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';

const PersonDetailModal = ({
  visible,
  person,
  onClose,
  onToggleStatus,
  onViewLogsHistory,
}) => {
  if (!person || !visible) return null;

  const isLoggedIn = person.status === 'Logged In';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Avatar Header */}
              <View style={styles.avatarContainer}>
                <View
                  style={[
                    styles.avatar,
                    isLoggedIn ? styles.avatarLoggedIn : styles.avatarLoggedOut,
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {person.name ? person.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              </View>

              <Text style={styles.name}>{person.name}</Text>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  isLoggedIn ? styles.badgeLoggedIn : styles.badgeLoggedOut,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    isLoggedIn ? styles.dotLoggedIn : styles.dotLoggedOut,
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    isLoggedIn ? styles.textLoggedIn : styles.textLoggedOut,
                  ]}
                >
                  {isLoggedIn ? 'Currently Logged In' : 'Currently Logged Out'}
                </Text>
              </View>

              <Text style={styles.timeText}>
                Last Log: {person.lastLoginFormatted || person.lastUpdated || 'Never'}
              </Text>

              {/* Action Button (Log In / Log Out) */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isLoggedIn ? styles.buttonLogOut : styles.buttonLogIn,
                ]}
                onPress={() => {
                  onToggleStatus(person.id);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>
                  {isLoggedIn ? 'Log Out' : 'Log In'}
                </Text>
              </TouchableOpacity>

              {/* Attendance Log History Section */}
              {onViewLogsHistory ? (
                <View style={styles.historySection}>
                  <Text style={styles.historySectionTitle}>View Attendance History:</Text>

                  <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => onViewLogsHistory(person, 'last15')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.historyBtnText}>📊 View Last 15 Days</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => onViewLogsHistory(person, 'thisMonth')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.historyBtnText}>📅 View This Month's Logs</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => onViewLogsHistory(person, 'lastMonth')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.historyBtnText}>🗓️ View Last Month's Logs</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    paddingTop: '5%', // 5% Top Padding
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: '90%',
  },
  avatarContainer: {
    marginTop: -10,
    marginBottom: 8,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoggedIn: {
    backgroundColor: '#D1FAE5',
  },
  avatarLoggedOut: {
    backgroundColor: '#FEE2E2',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1E293B',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 6,
  },
  badgeLoggedIn: {
    backgroundColor: '#DCFCE7',
  },
  badgeLoggedOut: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotLoggedIn: {
    backgroundColor: '#16A34A',
  },
  dotLoggedOut: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textLoggedIn: {
    color: '#15803D',
  },
  textLoggedOut: {
    color: '#4B5563',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonLogIn: {
    backgroundColor: '#10B981',
  },
  buttonLogOut: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  historySection: {
    width: '100%',
    marginBottom: 12,
  },
  historySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'flex-start',
  },
  historyBtnText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default PersonDetailModal;
