# Feriados locais por CEP

## Alternativa BrasilAPI

Sem instância local configurada, se ela falhar ou não retornar datas, o aplicativo importa os nacionais de `https://brasilapi.com.br/api/feriados/v1/{ano}`. Há também um botão que dispensa CEP para os nacionais. Feriados locais existentes são preservados; o resultado não é apresentado como cobertura municipal. A lista segue o calendário salarial já adotado: Carnaval, Corpus Christi e outras datas fora desse calendário não são ativados automaticamente. Os anos consultados aparecem na mensagem de sucesso. A importação ainda exige salvar o formulário.

A BrasilAPI identifica cidade e UF pelo CEP do local de trabalho. O CEP é enviado apenas para essa consulta, não salvo no banco. Rua e bairro não são persistidos. Não há consulta por CPF.

## Ativação pendente

https://feriados.dev/ disponibiliza uma API **self-hosted**, não uma URL pública pronta. Hospede https://github.com/feriados-dev/feriados-dev-oss com sua base de dados e configure no Vite/Vercel:

```dotenv
VITE_FERIADOS_API_URL=https://SEU-SERVIDOR-DE-FERIADOS
```

Essa configuração é opcional para os nacionais. Use a origem sem `/v1` no final. Configure HTTPS e CORS para o domínio do aplicativo e publique novamente. Não coloque segredos em variáveis VITE_: são públicas. Uma instância com autenticação privada precisará de proxy no servidor.

O cliente local consulta `/v1/holidays` com city, state, year, page e limit. Sem configurar a URL, a importação usa a BrasilAPI e informa seu escopo nacional.

## Escopo

- Importa somente datas estaduais e municipais; exclui pontos facultativos. Os nacionais continuam calculados pelo mecanismo existente.
- Consulta o ano inicial, o anterior (antecipações) e o seguinte (prévia cruzando dezembro). As datas são específicas do ano, não repetidas automaticamente.
- Salva cidade/UF, anos consultados e feriados no JSON da regra de salário existente. Não requer nova migração além da migração de salário já existente.
- Atualizações substituem apenas os feriados antes importados da API, preservando os manuais. Erros e resultados vazios mantêm a lista anterior.
- A cobertura municipal depende da base hospedada. Confira os resultados antes de salvar. Resultado vazio não garante ausência de feriados.
- Não há sincronização anual em segundo plano: para anos fora dos consultados, atualize a importação na regra ou adicione feriados manualmente.

Nenhum serviço foi hospedado nesta alteração. A consulta completa real depende da URL da sua instância.

## Teste após configurar

Selecione Salário, busque um CEP, confirme cidade/UF e importe. Confira as datas, salve e reabra para verificar a persistência. Teste também CEP inválido, serviço offline, cidade sem cobertura e mudança de ano.
