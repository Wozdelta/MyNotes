# MyNotes

Sistema financeiro moderno, robusto e responsivo desenvolvido com **React 18**, **TypeScript**, **Vite** e integração nativa com o **Supabase** (PostgreSQL, Row Level Security e Autenticação).

Projetado para operar com excelência tanto no **Desktop** quanto no **Celular (Mobile-First)**, garantindo cálculos financeiros com precisão absoluta em centavos e proteção contra imprecisões de ponto flutuante.

---

## 🚀 Funcionalidades Principais

1. **Visão Geral (Dashboard Completo):**
   - Saldo atual total consolidado e saldo individual por conta.
   - Total recebido e total pago no período (baseado na data efetiva).
   - Resultado realizado (*Superávit / Déficit*).
   - Total a receber e total a pagar (lançamentos previstos pendentes).
   - Destaque automático de pendências atrasadas com aviso sonoro/visual.
   - Resultado previsto total da agenda e projeção futura de saldo.
   - Gastos por categoria em gráfico interativo responsivo.
   - Próximos vencimentos com ação rápida de efetivação.

2. **Extrato e Lançamentos:**
   - CRUD completo: Criar, Editar, Duplicar, Cancelar e Excluir lançamentos.
   - Ações rápidas: Marcar como recebido/pago com confirmação da data efetiva, e desfazer efetivação.
   - Filtros combináveis: por texto (descrição/observações), período (data prevista ou efetiva), tipo (entradas/despesas), situação (pendentes, realizadas, atrasadas, canceladas), categoria, conta e frequência.
   - Totais consolidados de todo o conjunto filtrado (não apenas da página visível).
   - Apresentação em tabela rica no desktop e cards de toque no celular.
   - Exportação segura para CSV com codificação UTF-8 com BOM e sanitização contra CSV Injection.

3. **Calendário Financeiro:**
   - Visualização mensal em grade e visualização em agenda para dispositivos móveis.
   - Navegação rápida entre meses e botão "Hoje".
   - Alternância entre data prevista (visão padrão) e data efetiva (para histórico de pagamentos).
   - Resumo diário de entradas, despesas e saldo do dia.
   - Adição rápida de lançamentos com data pré-selecionada.

4. **Recorrências Inteligentes:**
   - Receitas e despesas recorrentes (diária, semanal, mensal e anual).
   - Regra do dia 31: meses curtos (30 dias ou 28/29 de fevereiro) usam o último dia válido e retornam para 31 nos meses completos.
   - Regra do ano bissexto para recorrências em 29 de fevereiro.
   - Ocorrências nascem sempre como previstas/pendentes.
   - Proteção de unicidade no banco e na camada de domínio: nunca duplica ocorrências.
   - Edição e exclusão individual sem reaparecer ao recarregar a sessão.

5. **Anotações & Possibilidades:**
   - Módulo exclusivo para valores sem data confirmada (troca de pneus, freelas, manutenções futuras).
   - Não polui os saldos reais nem o calendário até a efetivação.
   - Ação atômica **"Transformar em Lançamento"** que transfere o item diretamente para o extrato real impedindo conversão repetida.

6. **Análises & Relatórios:**
   - Entradas vs Despesas e histórico de evolução.
   - Gastos por Categoria com ranking e percentuais.
   - Despesas Fixas (recorrentes) vs Variáveis (eventuais).
   - Comparativo com período anterior sem risco de divisão por zero (`Sem base de comparação`).
   - Visualização em gráficos e em tabelas textuais.

7. **Contas e Transferências:**
   - Saldo inicial com data de referência (o saldo inicial não conta como receita).
   - Arquivamento de contas sem perda do histórico.
   - Transferência atômica entre contas (não altera o resultado financeiro consolidado).

8. **Categorias Customizáveis:**
   - Categorias padrão sugeridas (Salário, Alimentação, Moradia, Transporte, etc.) sem duplicar.
   - Cores personalizadas e distinção entre receitas e despesas.

9. **Autenticação & Segurança Supabase:**
   - Cadastro por e-mail e senha, login e logout.
   - Fluxo completo de recuperação e redefinição de nova senha.
   - Row Level Security (RLS) em 100% das tabelas do banco de dados PostgreSQL.
   - Fallback local automático para demonstração imediata caso as credenciais da nuvem ainda não tenham sido configuradas no `.env`.

---

## 📦 Como Instalar e Executar

### Pré-requisitos
- Node.js versão 18 ou superior.

### 1. Clonar ou extrair o projeto
Navegue até a pasta do projeto:
```bash
cd sistema-financeiro-completo
```

### 2. Instalar dependências
```bash
npm install
```
*(Se estiver no Windows sem o Node no PATH global, execute `./npm.cmd install`)*

### 3. Executar o servidor de desenvolvimento
```bash
npm run dev
```
O aplicativo estará disponível em: **`http://localhost:5173/`**

### 4. Executar os testes automatizados
```bash
npm run test
```

### 5. Gerar build de produção
```bash
npm run build
npm run preview
```

---

## 🔐 Configuração do Supabase

### 1. Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Preencha as variáveis com os dados do seu projeto no Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon-aqui
```

> **Atenção:** Nunca adicione o prefixo `VITE_` à sua chave secreta (`SUPABASE_SECRET` / `service_role`). Utilize exclusivamente a chave pública `anon` no cliente.

#### Configuração na Vercel

O arquivo `.env` existe apenas na máquina local e não é enviado ao Git. No projeto da Vercel, abra **Settings → Environment Variables** e cadastre as duas variáveis acima para **Production**, **Preview** e **Development**. Depois, faça um novo deploy para que o Vite incorpore os valores no build.

O aplicativo não possui fallback de dados no navegador. Se essas variáveis estiverem ausentes, ele bloqueia o acesso e informa o erro de configuração, evitando que informações pareçam salvas sem chegarem ao Supabase.

### 2. Executar o Script SQL
1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. Vá em **SQL Editor** > **New Query**.
3. Copie todo o conteúdo do arquivo [`supabase_setup.sql`](./supabase_setup.sql) e cole no editor.
4. Clique em **Run** para criar todas as tabelas, triggers, funções RPC e políticas RLS.

### 3. URLs de Autenticação no Supabase Dashboard
No painel do Supabase, acesse **Authentication** > **URL Configuration**:
- **Site URL**: `http://localhost:5173/` (ou seu domínio de produção)
- **Redirect URLs**: Adicione `http://localhost:5173/reset-password` e `http://localhost:5173/`

---

## 🧮 Regras Financeiras Centralizadas

- **Precisão Decimal:** Todas as operações monetárias são calculadas em centavos inteiros (`toCents` / `fromCents`), impedindo anomalias de arredondamento IEEE 754.
- **Saldo Atual:** Saldo inicial da conta + entradas efetivamente recebidas (a partir da data de referência) - despesas efetivamente pagas + transferências de entrada - transferências de saída.
- **Resultado Realizado:** Total recebido no período menos total pago no período (baseado na `effective_date`).
- **Resultado Previsto:** Total de entradas previstas menos total de despesas previstas agendadas no período (baseado na `expected_date`).
- **Saldo Projetado:** Saldo atual somado às receitas ainda não recebidas menos as despesas ainda não pagas de hoje até o final do período.
- **Atrasos:** Lançamentos com situação `pending` e `expected_date` anterior ao dia de hoje.
- **Datas:** Manipulação estrita em formato ISO (`YYYY-MM-DD`) no fuso `America/Sao_Paulo`, eliminando conversões errôneas para o dia anterior por UTC.

---

## 📄 Licença
Projeto desenvolvido para gestão financeira pessoal profissional e segura.
