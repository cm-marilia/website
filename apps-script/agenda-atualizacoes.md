# Agenda de atualização do carimbo

## Como aplicar o carimbo numa planilha

1. Abrir a planilha no Google Sheets.
2. `Extensões → Apps Script`.
3. Apagar o conteúdo do editor e colar o conteúdo do arquivo `.gs`
   correspondente (tabela abaixo), salvar.
4. Selecionar a função **criarGatilhos** no topo do editor, clicar em
   **Executar** e autorizar o acesso quando pedido.
5. Recarregar a planilha — o menu **Transparência** aparece e o carimbo já
   é gravado em A1.

Isso instala tudo de uma vez: o carimbo automático, a máscara de CPF e o
menu. Não precisa editar nada no `.gs` antes de colar — cada arquivo já
vem configurado para a planilha certa.

## Planilhas do portal

| Planilha | Script | Reforço agendado |
|---|---|---|
| contratos | [carimbo-contratos.gs](carimbo-contratos.gs) | toda segunda-feira, 10h–11h |
| diárias | [carimbo-diarias.gs](carimbo-diarias.gs) | toda segunda-feira, 14h–15h |
| empresas sancionadas | [carimbo-empresas_sancionadas.gs](carimbo-empresas_sancionadas.gs) | toda terça-feira, 8h–9h |
| julgamentos_contas_camara | [carimbo-julgamentos_contas_camara.gs](carimbo-julgamentos_contas_camara.gs) | 1ª segunda-feira do mês, 9h–10h |
| estagiarios | | |
| painel_manifestacoes | | |
| painel_orcamentario | | |
| remuneracao_detalhada_servidores | | |
| servidores | | |

As linhas em branco são planilhas que ainda não têm página migrada nem
script — preencher quando forem feitas.
