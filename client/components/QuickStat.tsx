import { Circle, SizableText, YStack } from 'tamagui';

interface QuickStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export const QuickStat = ({ icon, label, value }: QuickStatProps) => (
  <YStack
    flex={1}
    backgroundColor="#6a456e"
    borderColor="$borderColor"
    borderWidth={1}
    padding="$4"
    borderRadius={20}
  >
    <Circle size={36} backgroundColor="$primarySoft" mb="$3">
      {icon}
    </Circle>
    <SizableText color="$textLight" fontSize={13} mb="$1">
      {label}
    </SizableText>
    <SizableText color="$textLight" fontSize={18} fontWeight="700">
      {value}
    </SizableText>
  </YStack>
);
