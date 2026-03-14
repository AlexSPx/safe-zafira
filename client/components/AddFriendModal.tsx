import React, { useState } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Circle,
  Input,
  Theme,
  useTheme,
} from 'tamagui';
import { Modal, TouchableOpacity } from 'react-native';
import { X, UserPlus } from 'lucide-react-native';

type AddFriendModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddFriend: (username: string) => void;
};

export const AddFriendModal = ({
  visible,
  onClose,
  onAddFriend,
}: AddFriendModalProps) => {
  const theme = useTheme();
  const [username, setUsername] = useState('');

  const handleSubmit = () => {
    if (username.trim() === '') return;
    onAddFriend(username.trim());
    setUsername('');
    onClose();
  };

  const handleClose = () => {
    setUsername('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Theme name="dark">
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          backgroundColor="rgba(0,0,0,0.7)"
          px="$4"
        >
          <YStack
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={20}
            padding="$5"
            width="100%"
            maxWidth={400}
          >
            <XStack jc="space-between" ai="center" mb="$4">
              <SizableText color="$textLight" fontSize={20} fontWeight="700">
                Add Friend
              </SizableText>
              <TouchableOpacity onPress={handleClose}>
                <Circle size={32} backgroundColor="$primarySoft">
                  <X size={18} color={theme.textLight?.val} />
                </Circle>
              </TouchableOpacity>
            </XStack>

            <SizableText color="$textMuted" fontSize={14} mb="$3">
              Enter your friend's username to send them a friend request.
            </SizableText>

            <Input
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              size="$4"
              backgroundColor="$background"
              borderColor="$borderColor"
              color="$textLight"
              mb="$4"
            />

            <TouchableOpacity onPress={handleSubmit}>
              <XStack
                backgroundColor="$button"
                borderRadius={16}
                py="$3"
                px="$4"
                ai="center"
                jc="center"
                gap="$2"
              >
                <UserPlus size={18} color={theme.textLight?.val} />
                <SizableText color="$textLight" fontSize={15} fontWeight="700">
                  Add Friend
                </SizableText>
              </XStack>
            </TouchableOpacity>
          </YStack>
        </YStack>
      </Theme>
    </Modal>
  );
};
