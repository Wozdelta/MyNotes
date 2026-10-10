import React, { useState } from 'react';
import { findBankBrand } from '../../utils/bankBrand';

export const BankLogo: React.FC<{ name: string }> = ({ name }) => {
  const bank = findBankBrand(name);
  const [failed, setFailed] = useState<string | null>(null);
  if (!bank || failed === bank.slug) return null;
  return <img className="bank-logo" src={bank.logo} width={46} height={46} alt={`Logo ${bank.name}`} onError={() => setFailed(bank.slug)} />;
};
