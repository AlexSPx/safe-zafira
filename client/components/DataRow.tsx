import { SizableText, XStack } from 'tamagui';

interface DataRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  error?: boolean;
}

export const DataRow = ({
  label,
  value,
  highlight = false,
  error = false,
}: DataRowProps) => (
  <XStack
    justifyContent="space-between"
    alignItems="center"
    paddingVertical="$3"
  >
    <SizableText color="$textMuted" fontSize={14} fontWeight="500">
      {label}
    </SizableText>
    <SizableText
      color={error ? '#ef4444' : highlight ? '#4ade80' : '$textLight'}
      fontSize={14}
      fontWeight="600"
    >
      {value}
    </SizableText>
  </XStack>
);
