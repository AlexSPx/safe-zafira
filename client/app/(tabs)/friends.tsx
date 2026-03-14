import React, { useState } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  ScrollView,
  Circle,
  Input,
  Button,
  useTheme,
} from 'tamagui';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity, Modal } from 'react-native';
import { FriendRow } from '../../components/FriendRow';
import { RowSeparator } from '../../components/RowSeparator';
import { Plus, UserRoundX, X } from 'lucide-react-native';

const initialFriends = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
  { id: '3', name: 'Alex Johnson' },
];

export default function FriendsScreen() {
  const theme = useTheme();
  const [friends, setFriends] = useState(initialFriends);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');

  const hasNoFriends = friends.length === 0;

  const handleAddFriend = () => {
    if (newFriendUsername.trim() === '') return;

    const newFriend = {
      id: Date.now().toString(),
      name: newFriendUsername.trim(),
    };

    setFriends([...friends, newFriend]);
    setNewFriendUsername('');
    setIsModalVisible(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <Stack.Screen options={{ title: 'Friends', headerShown: false }} />

      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
            flexGrow: 1,
          }}
        >
          <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$2">
            <SizableText
              color="$textLight"
              fontSize={24}
              fontWeight="700"
              lineHeight={32}
            >
              Friends
            </SizableText>
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <XStack
                backgroundColor="$buttonSecondary"
                px="$4"
                py="$2"
                borderRadius={20}
                ai="center"
                gap="$2"
              >
                <Plus size={16} color={theme.textLight?.val} />
                <SizableText color="$textLight" fontSize={14} fontWeight="700">
                  Add Friend
                </SizableText>
              </XStack>
            </TouchableOpacity>
          </XStack>

          {hasNoFriends ? (
            <YStack
              flex={1}
              justifyContent="center"
              alignItems="center"
              py="$10"
              px="$4"
            >
              <Circle
                size={100}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                mb="$4"
              >
                <UserRoundX size={48} color={theme.textMuted?.val} />
              </Circle>
              <SizableText
                color="$textLight"
                fontSize={18}
                fontWeight="600"
                mb="$2"
              >
                No Friends Yet
              </SizableText>
              <SizableText
                color="$textMuted"
                fontSize={14}
                textAlign="center"
                maxWidth={260}
              >
                You don't have any friends added. Tap "Add Friend" to get
                started.
              </SizableText>
            </YStack>
          ) : (
            <YStack px="$4" mt="$4">
              <SizableText
                color="$textMuted"
                fontSize={12}
                letterSpacing={1.5}
                mb="$3"
                fontWeight="600"
              >
                YOUR FRIENDS
              </SizableText>
              <YStack
                backgroundColor="$surface"
                borderColor="$borderColor"
                borderWidth={1}
                paddingHorizontal="$4"
                borderRadius={20}
              >
                {friends.map((friend, index) => (
                  <React.Fragment key={friend.id}>
                    <FriendRow name={friend.name} />
                    {index < friends.length - 1 && <RowSeparator />}
                  </React.Fragment>
                ))}
              </YStack>
            </YStack>
          )}
        </ScrollView>
      </YStack>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
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
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
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
              value={newFriendUsername}
              onChangeText={setNewFriendUsername}
              autoCapitalize="none"
              size="$4"
              backgroundColor="$background"
              borderColor="$borderColor"
              color="$textLight"
              mb="$4"
            />

            <Button
              size="$4"
              backgroundColor="$button"
              onPress={handleAddFriend}
              pressStyle={{ opacity: 0.8 }}
            >
              Add Friend
            </Button>
          </YStack>
        </YStack>
      </Modal>
    </SafeAreaView>
  );
}
