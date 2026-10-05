import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

export const OnboardingTour: React.FC = () => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mynotes_has_seen_tour');
    if (!hasSeenTour) {
      setRun(true);
    }
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('mynotes_has_seen_tour', 'true');
    }
  };

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: 'Bem-vindo ao MyNotes! 🎉',
      content: 'Vamos fazer um tour rápido para você conhecer as principais funcionalidades e tirar o máximo de proveito do nosso sistema.',
      disableBeacon: true,
    },
    {
      target: '.tour-step-dashboard',
      content: 'Aqui na Visão Geral você acompanha o resumo da sua saúde financeira, saldos atuais e os últimos lançamentos.',
    },
    {
      target: '.tour-step-transactions',
      content: 'Em Lançamentos você pode gerenciar todas as suas receitas e despesas. Crie, edite ou exclua registros com facilidade.',
    },
    {
      target: '.tour-step-calendar',
      content: 'O Calendário oferece uma visão mensal dos seus recebimentos e pagamentos, ótimo para previsibilidade financeira.',
    },
    {
      target: '.tour-step-recurrences',
      content: 'Gerencie assinaturas e contas fixas aqui! As recorrências geram lançamentos automaticamente para você não esquecer de nada.',
    },
    {
      target: '.tour-step-analytics',
      content: 'Em Análises, disponibilizamos gráficos detalhados para você entender para onde está indo o seu dinheiro.',
    },
    {
      target: '.tour-step-new-transaction',
      content: 'Use estes botões rápidos para adicionar novas entradas ou despesas de qualquer lugar do aplicativo.',
    },
    {
      target: '.tour-step-theme',
      content: 'Prefere um visual mais escuro? Você pode alternar entre os temas Claro e Escuro clicando aqui.',
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      scrollToFirstStep={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'var(--primary-color)',
          textColor: 'var(--text-main)',
          backgroundColor: 'var(--bg-card)',
          arrowColor: 'var(--bg-card)',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        },
        tooltip: {
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
        },
        buttonNext: {
          backgroundColor: 'var(--primary-color)',
          borderRadius: 'var(--radius-sm)',
        },
        buttonBack: {
          color: 'var(--text-muted)',
        },
        buttonSkip: {
          color: 'var(--text-subtle)',
        }
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
};
