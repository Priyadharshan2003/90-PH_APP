import { InputFieldProps } from '../types/type';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// Extended props for validation
interface ExtendedInputFieldProps extends InputFieldProps {
  onValidation?: (text: string) => string | null;
  error?: string;
  onValueChange?: (text: string) => void;
}

const InputField = ({
  label,
  icon,
  secureTextEntry = false,
  labelStyle,
  containerStyle,
  inputStyle,
  iconStyle,
  className,
  onValidation,
  error,
  onValueChange,
  onChangeText,
  ...props
}: ExtendedInputFieldProps) => {
  const handleChangeText = (text: string) => {
    // Call the parent's onChangeText if provided
    onChangeText?.(text);

    // Call custom validation if provided
    if (onValidation) {
      const validationError = onValidation(text);
      // Handle validation error through onValueChange
      onValueChange?.(text);
    } else {
      // If no validation, just pass the value
      onValueChange?.(text);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="w-full">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="my-2 w-full">
          <Text className={`font-manrope mb-3 text-lg ${labelStyle}`}>{label}</Text>
          <View
            className={`relative flex flex-row items-center justify-start rounded-full border bg-gray-100 ${
              error ? 'border-red-500' : 'border-gray-200'
            } px-4 ${containerStyle}`}>
            {icon && (
              <Ionicons name={icon} size={24} color="#666" className={`mr-2 ${iconStyle}`} />
            )}
            <TextInput
              className={`font-manrope flex-1 py-4 text-[15px] text-gray-800 ${inputStyle}`}
              secureTextEntry={secureTextEntry}
              placeholderTextColor="#666"
              onChangeText={handleChangeText}
              {...props}
            />
          </View>
          {error && <Text className="font-manrope mt-1 text-sm text-red-500">{error}</Text>}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default InputField;
