import React, { useState } from 'react';
import { YStack, XStack, SizableText, useTheme } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';

type ExpandableItemProps = {
  code: string;
  title: string;
  description: string;
};

export const ExpandableItem = ({
  code,
  title,
  description,
}: ExpandableItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useTheme();

  return (
    <YStack>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingVertical="$3"
        >
          <XStack alignItems="center" gap="$3" flex={1}>
            <XStack
              backgroundColor="$primarySoft"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={6}
            >
              <SizableText color="$textLight" fontSize={12} fontWeight="700">
                {code}
              </SizableText>
            </XStack>
            <SizableText
              color="$textLight"
              fontSize={14}
              fontWeight="500"
              flex={1}
            >
              {title}
            </SizableText>
          </XStack>
          <XStack
            width={28}
            height={28}
            justifyContent="center"
            alignItems="center"
            backgroundColor="$primarySoft"
            borderRadius={14}
          >
            {isExpanded ? (
              <Minus size={16} color={theme.textLight?.val} />
            ) : (
              <Plus size={16} color={theme.textLight?.val} />
            )}
          </XStack>
        </XStack>
      </TouchableOpacity>

      {isExpanded && (
        <YStack
          backgroundColor="$background"
          padding="$3"
          borderRadius={12}
          marginBottom="$2"
        >
          <SizableText color="$textMuted" fontSize={13} lineHeight={20}>
            {description}
          </SizableText>
        </YStack>
      )}
    </YStack>
  );
};
