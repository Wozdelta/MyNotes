import React, { useState } from 'react';
import {
  Archive,
  Edit2,
  FolderTree,
  Plus,
  RotateCcw,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { useFinance } from '../context/FinanceContext';
import { Category, TransactionType } from '../types';

export const CategoriesPage: React.FC = () => {
  const { categories, createCategory, updateCategory, isSubmitting } = useFinance();

  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState('#3b82f6');
  const [errorMsg, setErrorMsg] = useState('');

  const openCreateModal = (catType: TransactionType) => {
    setEditingCategory(null);
    setName('');
    setType(catType);
    setColor(catType === 'income' ? '#10b981' : '#ef4444');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || '#3b82f6');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Informe o nome da categoria.');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: name.trim(),
          type,
          color
        });
      } else {
        await createCategory({
          name: name.trim(),
          type,
          color,
          is_archived: false
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar categoria');
    }
  };

  const filteredCategories = categories.filter(c => c.type === activeTab);

  return (
    <div className="page-wrapper">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Categorias
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Organize suas entradas e saídas por classificação orçamentária.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => openCreateModal(activeTab)}>
          <Plus size={16} />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Tabs: Entradas vs Despesas */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn ${activeTab === 'expense' ? 'btn-expense' : 'btn-outline'}`}
          onClick={() => setActiveTab('expense')}
        >
          <TrendingDown size={16} />
          <span>Categorias de Despesas ({categories.filter(c => c.type === 'expense').length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'income' ? 'btn-income' : 'btn-outline'}`}
          onClick={() => setActiveTab('income')}
        >
          <TrendingUp size={16} />
          <span>Categorias de Entradas ({categories.filter(c => c.type === 'income').length})</span>
        </button>
      </div>

      {/* Grid de Categorias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {filteredCategories.map(cat => (
          <div
            key={cat.id}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              opacity: cat.is_archived ? 0.6 : 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: cat.color || '#3b82f6',
                  flexShrink: 0
                }}
              />
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{cat.name}</span>
                {cat.is_archived && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                    (Arquivada)
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn-icon"
                title="Editar categoria"
                onClick={() => openEditModal(cat)}
                style={{ width: 32, height: 32 }}
              >
                <Edit2 size={15} />
              </button>
              <button
                className="btn-icon"
                title={cat.is_archived ? 'Reativar categoria' : 'Arquivar categoria'}
                onClick={() => updateCategory(cat.id, { is_archived: !cat.is_archived })}
                style={{ width: 32, height: 32 }}
              >
                {cat.is_archived ? <RotateCcw size={15} /> : <Archive size={15} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar/Editar Categoria */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Editar Categoria' : `Nova Categoria de ${type === 'income' ? 'Entrada' : 'Despesa'}`}
        maxWidth="420px"
      >
        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--expense-light)',
                color: 'var(--expense-color)',
                fontSize: '0.875rem',
                marginBottom: 16
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nome da Categoria *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Alimentação, Transporte..."
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={type}
              onChange={e => setType(e.target.value as TransactionType)}
            >
              <option value="expense">Despesa</option>
              <option value="income">Entrada</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Cor de Identificação</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{ width: 44, height: 44, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'transparent' }}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{color}</span>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 12 }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editingCategory ? 'Salvar' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
