import React, { useEffect, useState } from 'react';
import { formatCurrency, parseCurrencyInput } from '../../utils/finance';

interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  id,
  name,
  required,
  disabled,
  placeholder = 'R$ 0,00'
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    if (value === 0 && !displayValue) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Extrai apenas dígitos
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const cents = parseInt(digitsOnly, 10);
    const floatVal = cents / 100;
    setDisplayValue(formatCurrency(floatVal));
    onChange(floatVal);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      name={name}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className="form-input"
      value={displayValue}
      onChange={handleChange}
      style={{ fontWeight: 600, fontSize: '1.0625rem' }}
    />
  );
};
