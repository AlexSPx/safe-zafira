import React from 'react';
import { XStack, SizableText, Circle, useTheme } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { User, ChevronRight } from 'lucide-react-native';

type FriendRowProps = {
  name: string;
  onPress?: () => void;
};

export const FriendRow = ({ name, onPress }: FriendRowProps) => {
  const theme = useTheme();

  const content = (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingVertical="$3"
      flex={1}
    >
      <XStack alignItems="center" gap="$3" flex={1}>
        <Circle size={40} backgroundColor="$primarySoft">
          <User size={20} color={theme.textLight?.val} />
        </Circle>
        <SizableText color="$textLight" fontSize={16} fontWeight="600">
          {name}
        </SizableText>
      </XStack>
      {onPress && <ChevronRight size={20} color={theme.textMuted?.val} />}
    </XStack>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
