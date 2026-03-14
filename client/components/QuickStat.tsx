import { Card, SizableText } from 'tamagui';

export const QuickStat = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <Card flex={1} backgroundColor="$zafiraCard" padding="$3" borderRadius="$4">
    <SizableText fontSize={28} mb="$2">
      {icon}
    </SizableText>
    <SizableText color="$zafiraInputPlaceholderText" size="$3">
      {label}
    </SizableText>
    <SizableText color="white" size="$6" fontWeight="bold" mt="$1">
      {value}
    </SizableText>
  </Card>
);
