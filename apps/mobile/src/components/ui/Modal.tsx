import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  type ModalProps as RNModalProps,
} from 'react-native';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react-native';

export interface ModalProps extends Omit<RNModalProps, 'visible'> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  contentClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
  className,
  contentClassName,
  ...props
}) => {
  return (
    <RNModal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      {...props}
    >
      <TouchableWithoutFeedback onPress={closeOnBackdrop ? onClose : undefined}>
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <TouchableWithoutFeedback>
            <View
              className={cn(
                'w-full max-w-md bg-dark-surface rounded-2xl border border-dark-border',
                className,
              )}
            >
              {(title || showCloseButton) && (
                <View className="flex-row items-center justify-between p-4 border-b border-dark-border">
                  <View className="flex-1">
                    {title && (
                      <Text className="text-lg font-semibold text-white">{title}</Text>
                    )}
                    {description && (
                      <Text className="text-sm text-dark-muted mt-1">{description}</Text>
                    )}
                  </View>
                  {showCloseButton && (
                    <TouchableOpacity onPress={onClose} className="ml-4">
                      <X size={24} color="#71717a" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View className={cn('p-4', contentClassName)}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

// Alert Dialog variant
export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton={false}
      closeOnBackdrop={false}
    >
      <View className="items-center">
        <Text className="text-lg font-semibold text-white text-center">{title}</Text>
        {description && (
          <Text className="text-sm text-dark-muted text-center mt-2">{description}</Text>
        )}
      </View>
      <View className="flex-row mt-6 gap-3">
        <TouchableOpacity
          onPress={onClose}
          className="flex-1 h-12 items-center justify-center rounded-lg border border-dark-border"
        >
          <Text className="text-base font-medium text-white">{cancelText}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirm}
          className={cn(
            'flex-1 h-12 items-center justify-center rounded-lg',
            variant === 'destructive' ? 'bg-red-600' : 'bg-intel-600',
          )}
        >
          <Text className="text-base font-medium text-white">{confirmText}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
