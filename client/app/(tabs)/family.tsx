import React, { useState, useEffect } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  ScrollView,
  Circle,
  useTheme,
} from 'tamagui';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { FriendRow } from '../../components/FriendRow';
import { RowSeparator } from '../../components/RowSeparator';
import { Plus, UserRoundX } from 'lucide-react-native';
import { AddFriendModal } from '../../components/AddFriendModal';
import { useFamily } from '../../hooks/useFamily';
import { useAuthStore } from '../../stores/authStore';
import { setFamilyError } from '../../stores/familyStore';

export default function FamilyScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const {
    members,
    isLoading,
    error,
    fetchFamilyDashboard,
    addGuardianByEmail,
  } = useFamily();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const hasNoFriends = members.length === 0;

  useEffect(() => {
    if (user?.userId != null) {
      fetchFamilyDashboard(user.userId);
    }
  }, [user?.userId, fetchFamilyDashboard]);

  const handleOpenModal = () => {
    setFamilyError(null);
    setIsModalVisible(true);
  };

  const handleAddFriend = async (email: string) => {
    if (!user?.userId || !email.trim()) return;
    try {
      await addGuardianByEmail(user.userId, email.trim());
      setIsModalVisible(false);
    } catch {
      // error is already set in store
    }
  };

  const handleMemberPress = (memberId: number, memberName: string) => {
    router.push({
      pathname: '/familyMemberStats',
      params: { memberId: memberId.toString(), memberName },
    });
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
            <TouchableOpacity onPress={handleOpenModal}>
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

          {error ? (
            <XStack px="$4" py="$2" backgroundColor="$red3">
              <SizableText color="$red11" fontSize={14}>
                {error}
              </SizableText>
            </XStack>
          ) : null}

          {isLoading && members.length === 0 ? (
            <YStack flex={1} py="$10" px="$4" ai="center">
              <SizableText color="$textMuted" fontSize={14}>
                Loading...
              </SizableText>
            </YStack>
          ) : hasNoFriends ? (
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
                {members.map((member, index) => (
                  <React.Fragment key={member.id}>
                    <FriendRow
                      name={member.username}
                      onPress={() =>
                        handleMemberPress(member.id, member.username)
                      }
                    />
                    {index < members.length - 1 && <RowSeparator />}
                  </React.Fragment>
                ))}
              </YStack>
            </YStack>
          )}
        </ScrollView>
      </YStack>

      <AddFriendModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onAddFriend={handleAddFriend}
      />
    </SafeAreaView>
  );
}
