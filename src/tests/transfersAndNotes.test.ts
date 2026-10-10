import { describe, expect, it } from 'vitest';
import { DataRepository } from '../services/dataRepository';

describe('Atomic Transfers & Notes Conversion Tests', () => {
  it('impede transferência para a mesma conta e valor negativo', async () => {
    const repo = new DataRepository('test-user-transfer');

    // Mesma conta
    await expect(
      repo.createTransfer({
        origin_account_id: 'acc-1',
        destination_account_id: 'acc-1',
        amount: 100,
        transfer_date: '2026-10-05'
      })
    ).rejects.toThrow('A conta de origem e destino não podem ser as mesmas');

    // Valor zero ou negativo
    await expect(
      repo.createTransfer({
        origin_account_id: 'acc-1',
        destination_account_id: 'acc-2',
        amount: -50,
        transfer_date: '2026-10-05'
      })
    ).rejects.toThrow('O valor da transferência deve ser maior que zero');
  });

  it('converte anotação em lançamento e impede conversão duplicada', async () => {
    const repo = new DataRepository('test-user-notes');

    // Cria anotação de possível gasto
    const note = await repo.createNote({
      title: 'Pintura da sala',
      type: 'possible_expense',
      estimated_amount: 800,
      status: 'open'
    });

    await repo.createAccount({
      name: 'Conta de teste',
      initial_balance: 0,
      initial_balance_date: '2026-10-01',
      is_archived: false
    });

    const accounts = await repo.getAccounts();
    const categories = await repo.getCategories();

    // Primeira conversão: deve ter sucesso
    const result = await repo.convertNoteToTransaction(note.id, {
      account_id: accounts[0].id,
      category_id: categories[0].id,
      amount: 850,
      expected_date: '2026-11-01',
      description: 'Pintura da sala contratada'
    });

    expect(result.note.status).toBe('converted');
    expect(result.note.converted_transaction_id).toBe(result.transaction.id);
    expect(result.transaction.amount).toBe(850);
    expect(result.transaction.type).toBe('expense');

    // Segunda tentativa de conversão da MESMA anotação: DEVE FALHAR
    await expect(
      repo.convertNoteToTransaction(note.id, {
        account_id: accounts[0].id,
        category_id: categories[0].id,
        amount: 850,
        expected_date: '2026-11-01'
      })
    ).rejects.toThrow('Esta anotação já foi convertida em lançamento anteriormente');
  });
});
