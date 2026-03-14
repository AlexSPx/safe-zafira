import React from 'react';
import { XStack, SizableText, Circle, useTheme } from 'tamagui';
import { User } from 'lucide-react-native';

type FriendRowProps = {
  name: string;
};

export const FriendRow = ({ name }: FriendRowProps) => {
  const theme = useTheme();

  return (
    <XStack alignItems="center" gap="$3" paddingVertical="$3">
      <Circle size={40} backgroundColor="$primarySoft">
        <User size={20} color={theme.textLight?.val} />
      </Circle>
      <SizableText color="$textLight" fontSize={16} fontWeight="600">
        {name}
      </SizableText>
    </XStack>
  );
};
