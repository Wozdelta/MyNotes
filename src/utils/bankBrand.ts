const banks = [
  ['nubank', 'Nubank', ['nubank', 'nu bank']],
  ['inter', 'Banco Inter', ['inter', 'banco inter']],
  ['c6bank', 'C6 Bank', ['c6', 'c6 bank', 'c6bank', 'banco c6']],
  ['neon', 'Neon', ['neon', 'banco neon']],
  ['pan', 'Banco PAN', ['pan', 'banco pan']],
  ['pagbank', 'PagBank', ['pagbank', 'pag bank', 'pagseguro']],
  ['mercadopago', 'Mercado Pago', ['mercado pago', 'mercadopago']],
  ['picpay', 'PicPay', ['picpay', 'pic pay']],
  ['willbank', 'Will Bank', ['will bank', 'willbank']],
  ['bmg', 'Banco BMG', ['bmg', 'banco bmg']],
  ['original', 'Banco Original', ['original', 'banco original']],
  ['next', 'Next', ['next', 'banco next']],
  ['infinitepay', 'InfinitePay', ['infinitepay', 'infinite pay']],
  ['itau', 'Itaú', ['itau', 'banco itau', 'itau unibanco']],
  ['bradesco', 'Bradesco', ['bradesco', 'banco bradesco']],
  ['santander', 'Santander', ['santander', 'banco santander']],
  ['caixa', 'Caixa', ['caixa', 'caixa economica', 'caixa economica federal']],
  ['bancodobrasil', 'Banco do Brasil', ['banco do brasil', 'bb']],
  ['sicredi', 'Sicredi', ['sicredi']],
  ['sicoob', 'Sicoob', ['sicoob']]
] as const;

export function findBankBrand(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const match = banks.find(([, , aliases]) => aliases.some(alias => normalized === alias ||
    (normalized.startsWith(alias + ' ') && /^(principal|pessoal|pj|pf|empresa|empresarial|salario|reserva|poupanca|conta|\d+)( |$)/.test(normalized.slice(alias.length + 1)))));
  return match ? { slug: match[0], name: match[1], logo: `${import.meta.env.BASE_URL}banks/${match[0]}.svg` } : null;
}
