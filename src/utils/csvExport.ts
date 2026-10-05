import { Account, Category, Transaction } from '../types';
import { formatDateBR } from './date';
import { formatCurrency } from './finance';

/**
 * Neutraliza células de texto para impedir CSV Injection / Execução de fórmulas maliciosas
 * no Microsoft Excel, LibreOffice ou Google Planilhas.
 */
export function sanitizeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Se começar com caracteres de fórmula, prefixa com apóstrofo
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escapa aspas duplas internas duplicando-as
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  filename: string = 'lancamentos_financeiros.csv'
): void {
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const headers = [
    'Tipo',
    'Descrição',
    'Valor (R$)',
    'Categoria',
    'Conta',
    'Data Prevista',
    'Situação',
    'Data Efetiva',
    'Recorrente',
    'Observações'
  ];

  const rows = transactions.map(t => {
    const tipoLabel = t.type === 'income' ? 'Entrada' : 'Despesa';
    let statusLabel = 'Pendente';
    if (t.status === 'completed') {
      statusLabel = t.type === 'income' ? 'Recebido' : 'Pago';
    } else if (t.status === 'cancelled') {
      statusLabel = 'Cancelado';
    }

    const categoryName = categoryMap.get(t.category_id) || 'Sem categoria';
    const accountName = accountMap.get(t.account_id) || 'Sem conta';

    return [
      sanitizeCSVValue(tipoLabel),
      sanitizeCSVValue(t.description),
      sanitizeCSVValue(t.amount.toFixed(2).replace('.', ',')), // Formato numérico aceito pelo Excel PT-BR
      sanitizeCSVValue(categoryName),
      sanitizeCSVValue(accountName),
      sanitizeCSVValue(formatDateBR(t.expected_date)),
      sanitizeCSVValue(statusLabel),
      sanitizeCSVValue(t.effective_date ? formatDateBR(t.effective_date) : ''),
      sanitizeCSVValue(t.is_recurrent ? 'Sim' : 'Não'),
      sanitizeCSVValue(t.notes || '')
    ].join(';');
  });

  // \uFEFF é o Byte Order Mark (BOM) UTF-8, indispensável para o Excel no Windows abrir com acentos corretos
  const csvContent = '\uFEFF' + headers.map(h => sanitizeCSVValue(h)).join(';') + '\r\n' + rows.join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
