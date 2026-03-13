import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../i18n';

export default function BlockReasonModal({ visible, userName, onConfirm, onCancel }) {
  const BLOCK_REASONS = [
    { id: 'no_reason', label: t('block.reasons.noReason') },
    { id: 'bad_photos', label: t('block.reasons.badPhotos') },
    { id: 'bad_messages', label: t('block.reasons.badMessages') },
    { id: 'spam', label: t('block.reasons.spam') },
    { id: 'fake_account', label: t('block.reasons.fakeAccount') },
    { id: 'other', label: t('block.reasons.other') },
  ];
  const [selectedReason, setSelectedReason] = useState(null);
  const [otherReasonText, setOtherReasonText] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  const handleReasonSelect = (reasonId) => {
    setSelectedReason(reasonId);

    if (reasonId === 'other') {
      setShowOtherInput(true);
    } else {
      setShowOtherInput(false);
      setOtherReasonText('');
    }
  };

  const handleCancel = () => {
    setSelectedReason(null);
    setOtherReasonText('');
    setShowOtherInput(false);
    onCancel();
  };

  const handleConfirm = () => {
    if (!selectedReason) return;

    const reason = selectedReason === 'other' ? otherReasonText : selectedReason;
    onConfirm(reason);

    // Reset state
    setSelectedReason(null);
    setOtherReasonText('');
    setShowOtherInput(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
        />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('block.title', { userName })}
            </Text>
          </View>

          {/* Reasons List */}
          <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
            {BLOCK_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.id && styles.reasonOptionSelected,
                ]}
                onPress={() => handleReasonSelect(reason.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason.id && styles.reasonTextSelected,
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Other Reason Input */}
            {showOtherInput && (
              <View style={styles.otherInputContainer}>
                <View style={styles.otherInputHeader}>
                  <Text style={styles.otherInputTitle}>{t('block.otherLabel')}</Text>
                  <TouchableOpacity onPress={() => setShowOtherInput(false)}>
                    <Ionicons name="chevron-up" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.otherInput}
                  placeholder={t('block.otherReason')}
                  placeholderTextColor="#9CA3AF"
                  value={otherReasonText}
                  onChangeText={setOtherReasonText}
                  multiline
                  autoFocus
                  maxLength={200}
                />
              </View>
            )}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>{t('block.cancel')}</Text>
          </TouchableOpacity>

          {/* Block Confirm Button */}
          {selectedReason && (
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedReason || (selectedReason === 'other' && !otherReasonText.trim())) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.7}
              disabled={!selectedReason || (selectedReason === 'other' && !otherReasonText.trim())}
            >
              <Text style={styles.confirmButtonText}>{t('block.blockUser')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 22,
  },
  reasonsList: {
    paddingHorizontal: 20,
  },
  reasonOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  reasonText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  reasonTextSelected: {
    fontWeight: '600',
  },
  otherInputContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  otherInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  otherInputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  otherInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButton: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  confirmButton: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
