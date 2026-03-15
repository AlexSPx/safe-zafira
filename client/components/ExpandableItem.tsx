import React, { useState } from 'react';
import { YStack, XStack, SizableText, Spinner, useTheme } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Plus, Minus, Sparkles } from 'lucide-react-native';
import { aiService } from '../services/aiService';

type ExpandableItemProps = {
  code: string;
  title?: string;
  vehicleMake?: string;
  vehicleModel?: string;
};

export const ExpandableItem = ({
  code,
  title,
  vehicleMake,
  vehicleModel,
}: ExpandableItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const theme = useTheme();

  const handleAskForHelp = async () => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const vehicleInfo = [vehicleMake, vehicleModel].filter(Boolean).join(' ');
      const desc = vehicleInfo ? `${vehicleInfo} - ${code}` : code;
      const suggestion = await aiService.suggestDtcFix(code, desc);
      setAiSuggestion(suggestion);
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : 'Failed to get suggestion',
      );
    } finally {
      setIsLoadingAi(false);
    }
  };

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
            {title ? (
              <SizableText
                color="$textLight"
                fontSize={14}
                fontWeight="500"
                flex={1}
              >
                {title}
              </SizableText>
            ) : null}
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
          marginBottom="$5"
          gap="$3"
        >
          {aiError ? (
            <SizableText color="$red10" fontSize={12}>
              {aiError}
            </SizableText>
          ) : null}

          {aiSuggestion ? (
            <SizableText color="$textMuted" fontSize={13} lineHeight={20}>
              {aiSuggestion}
            </SizableText>
          ) : (
            <TouchableOpacity onPress={handleAskForHelp} disabled={isLoadingAi}>
              <XStack
                backgroundColor="$button"
                borderRadius={12}
                py="$2"
                px="$3"
                ai="center"
                jc="center"
                gap="$2"
                opacity={isLoadingAi ? 0.6 : 1}
              >
                {isLoadingAi ? (
                  <Spinner size="small" color="$textLight" />
                ) : (
                  <Sparkles size={16} color={theme.textLight?.val} />
                )}
                <SizableText color="$textLight" fontSize={13} fontWeight="600">
                  {isLoadingAi ? 'Thinking...' : 'Ask for help'}
                </SizableText>
              </XStack>
            </TouchableOpacity>
          )}
        </YStack>
      )}
    </YStack>
  );
};
