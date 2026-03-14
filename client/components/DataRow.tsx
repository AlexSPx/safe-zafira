import { SizableText, XStack } from 'tamagui';

export const DataRow = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <XStack
    justifyContent="space-between"
    alignItems="center"
    paddingVertical="$2"
  >
    <SizableText color="$zafiraInputPlaceholderText" size="$4" fontWeight="500">
      {label}
    </SizableText>
    <SizableText
      color={highlight ? '#4ade80' : 'white'}
      size="$4"
      fontWeight="bold"
    >
      {value}
    </SizableText>
  </XStack>
);
