---
version: alpha
name: "Cadência"
description: "Gestão de academia com precisão de agenda de treino e clareza administrativa."
colors:
  primary: "#244c72"
  background: "#f5f7fa"
  surface: "#ffffff"
  text: "#192b3b"
  muted: "#586878"
  border: "#dce3eb"
  success: "#176548"
  danger: "#ad3434"
  warning: "#8b540f"
typography:
  sans:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
rounded:
  DEFAULT: "0.5rem"
  lg: "0.875rem"
spacing:
  unit: "0.25rem"
  page-max: "88rem"
components:
  button: {}
  field: {}
  table: {}
  dialog: {}
---

# Cadência

## Overview
Produto administrativo para a recepção de uma academia e apresentação acadêmica em português brasileiro. A referência é uma agenda de treinamento cuidadosamente organizada: tipografia direta, linhas finas e dados fáceis de comparar. A assinatura é um marcador azul vertical no item de navegação ativo. Evitar estética de loja fitness, gradientes, excesso de cartões e elementos sem função.

Os tokens deste arquivo geram o CSS em `frontend/src/theme.generated.css`; componentes consomem variáveis sem manter outra paleta.

## Colors
Fundo frio, superfícies brancas e azul de ação. Vermelho, verde e âmbar são exclusivamente semânticos e sempre acompanhados de texto. Tema claro; cores de sistema em contraste forçado.

## Typography
Manrope nos títulos, Source Sans 3 nos controles e texto, números tabulares nas métricas. Fontes distribuídas localmente. Títulos de 28px no desktop e 24px no celular; corpo 15px, tabelas 14px.

## Layout
Sidebar de 224px acima de 900px, menu modal no celular. Conteúdo fluido até 88rem; margens de 36px/16px. Ritmo em múltiplos de 4px. Tabelas têm rolagem horizontal própria; formulários usam altura natural e duas colunas quando há espaço. Cabeçalhos e feedback reservam espaço.

## Elevation & Depth
Linhas e fundo definem os grupos. Sombra apenas em menus e modais. Nenhuma decoração compete com o conteúdo.

## Shapes
Controles de 8px, painéis de 14px. Ícones Lucide de 18px com traço consistente. Botões com altura mínima de 42px.

## Components
Botões, campos, tabelas e diálogos partilhados. Diálogos Radix com foco e Escape. Estado carregando com spinner e texto. Erros persistem junto da ação; confirmação financeira e arquivamento exigem diálogo. Gráficos discretos com tabela de valores equivalente.

Movimento de 180ms, apenas opacidade e deslocamento de 4px. Respeitar preferência de movimento reduzido. Scrollbars visíveis, com tokens de trilho e indicador. Navegação e demais comportamentos estão em UX-CONTRACT.md.

## Do's and Don'ts
Usar textos de ação concretos e português consistente. Não mostrar dados fictícios fora do seed explícito. Não esconder ações em hover. Não usar apenas cor para estados.

### Mobile

Até 600px, as listas usam registros empilhados com dados e ações visíveis. A hierarquia é nome/status, informações em duas colunas e ações com rótulos. Nenhuma ação principal depende de rolagem lateral. A navegação inferior oferece visão geral, alunos, mensalidades e menu completo. Formulários ocupam a área visível, com corpo rolável, cabeçalho e ações fixos; confirmações permanecem compactas. Campos usam fonte de 16px, e a área segura do dispositivo é respeitada.
