# Recuperação de senha

O aplicativo agora trata o evento PASSWORD_RECOVERY e oferece validação do código de recuperação com verifyOtp (type: recovery). A nova senha só é enviada com uma sessão autenticada pelo Supabase. Não é necessário alterar o banco.

## Configuração no painel Supabase

1. Em Authentication → URL Configuration, defina Site URL como a URL de produção do aplicativo e adicione essa mesma URL com a barra final em Redirect URLs. Adicione localhost separadamente se precisar testar localmente.
2. Em Authentication → Email Templates → Reset Password, substitua o corpo pelo modelo abaixo. A variável Token envia o código gerado pelo Supabase (o formato padrão documentado é de seis dígitos). Não trunque o código para quatro dígitos.
3. Publique o código atualizado na Vercel. Solicite um NOVO e-mail: mensagens antigas não mudam e seus tokens podem já ter sido consumidos/expirado.

```html
<h2>Redefinir sua senha do MyNotes</h2>
<p>Digite este código na tela de recuperação do aplicativo:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Ou <a href="{{ .ConfirmationURL }}">clique aqui para definir uma nova senha</a>.</p>
<p>Não compartilhe este código. Se você não solicitou a recuperação, ignore este e-mail.</p>
```

Para enviar somente código, remova o parágrafo com ConfirmationURL. O aplicativo aceita o código completo de 6 a 10 dígitos, conforme a configuração do projeto.

## Verificação manual após publicar

- Solicitar recuperação deslogado; validar código errado/expirado (deve manter o formulário e mostrar erro).
- Validar código novo correto: deve mostrar Nova Senha e confirmação, sem pular para o dashboard.
- Abrir um link novo de recuperação: deve mostrar o mesmo formulário.
- Salvar a senha, sair e entrar com a nova senha; a antiga deve falhar.
- Testar a URL de produção autorizada no Supabase, inclusive em outro navegador.

Configuração do painel e entrega real de e-mail não foram executadas pela alteração local.

Documentação: https://supabase.com/docs/guides/auth/auth-email-templates
