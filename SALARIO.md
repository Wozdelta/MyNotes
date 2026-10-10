# Recebimento de salário

## Instalação no Supabase

Execute **supabase-salary-migration.sql** no SQL Editor. É uma migração aditiva que preserva registros e RLS. Não execute `supabase-migration.sql` para esta atualização: esse arquivo antigo é um reset destrutivo.

Os campos `regra_salario` (JSONB) e `mes_salario` guardam a regra e o mês de referência no lançamento. A recorrência também guarda `regra_salario`. Nenhuma chave privilegiada é necessária no navegador. A migração não foi executada remotamente pelo assistente.

## Uso

Selecione Entrada e a categoria Salário. Configure dia fixo ou dia útil, mês de referência e feriados locais. A data prevista é calculada; a data efetiva continua independente, preenchida quando o dinheiro realmente chega. A prévia mostra três meses, sem criar entradas adicionais. A configuração é recuperada ao editar e preservada ao duplicar.

“Até o 10º” usa o 10º dia útil como limite da previsão, não como promessa de recebimento. Antecipações podem levar o pagamento ao mês/ano anterior; o mês de referência é preservado.

Recorrências mensais de Salário têm a mesma seção; o motor calcula cada mês individualmente, preservando intervalo, limites e exceções. Alterar a regra não reescreve lançamentos já gerados nem pagamentos realizados. O fluxo anterior do repositório gera ocorrências iniciais localmente; no Supabase ele apenas persiste a recorrência, sem um job de geração automática. Esta atualização não cria esse job e não cria séries automaticamente ao salvar uma entrada avulsa.

## Calendário

Exclui sábados e domingos conforme solicitado (não é um cálculo de prazo legal trabalhista). Feriados fixos: 1/1, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 25/12 e 20/11 a partir de 2024. Paixão de Cristo é calculada pela Páscoa de cada ano, seguindo o calendário federal operacional. Carnaval e Corpus Christi não são automaticamente excluídos: cadastre-os quando aplicáveis ao local de trabalho.

Referência: [calendário federal de 2026](https://www.gov.br/gestao/pt-br/assuntos/noticias/2025/dezembro/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026). Novas leis de feriados exigem atualizar a lista; não há dependência de API externa para calcular datas. Feriados estaduais/municipais são configurados por salário; podem repetir mês/dia anualmente ou valer somente na data indicada. Para feriados locais móveis, cadastre cada ano. As datas civis são calculadas em UTC e mantidas como YYYY-MM-DD, sem deslocamento de fuso.

## Verificação

`npm test` e `npm run build`. Testes cobrem dias fixos, meses curtos, ano bissexto, todas as opções de dia útil, feriados móveis/locais, antecipações, recorrências e persistência local isolada. Validação visual interativa e gravação no Supabase dependem do navegador e da migração aplicada no projeto real.
