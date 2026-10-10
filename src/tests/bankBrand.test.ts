import { describe, expect, it } from 'vitest';
import { findBankBrand } from '../utils/bankBrand';
describe('bank identification', () => {
  it.each(['Nubank','Banco Inter','C6 Bank','Neon','Banco PAN','PagBank','Mercado Pago','PicPay','Will Bank','Banco BMG','Banco Original','Next','InfinitePay'])('recognizes %s', name => { expect(findBankBrand(name)).not.toBeNull(); });
  it('ignores case, whitespace and accents', () => { expect(findBankBrand('  ITAÚ  ')?.slug).toBe('itau'); });
  it('accepts a personal account suffix', () => { expect(findBankBrand('Nubank - Principal')?.slug).toBe('nubank'); });
  it.each(['Carteira','Banco desconhecido','Internacional','Panela','Caixa de ferramentas','Nextel',''])('does not invent a logo for %s', name => { expect(findBankBrand(name)).toBeNull(); });
});
