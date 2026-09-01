# Padrão das planilhas — Portal de Transparência da Câmara de Marília

Documento de referência para quem mantém as planilhas do Google Sheets que
alimentam o Portal de Transparência. Mantê-lo atualizado a cada mudança de
estrutura.

- **Última revisão:** 31/08/2026
- **Aplica-se a:** contratos, servidores, diárias, remuneração detalhada,
  estagiários, empresas sancionadas, painel orçamentário, painel de
  manifestações, julgamentos de contas.

---

## 1. Como o portal funciona (resumo)

```
Google Sheets (você edita)
   └─ cada aba publicada na web como CSV  (Arquivo → Compartilhar → Publicar na web)
        └─ página HTML no GitHub Pages baixa o CSV e monta a tabela
             └─ o site oficial (marilia.sp.leg.br) embute a página num <iframe>
```

Cada página HTML tem, no topo do `<script>`, as URLs dos CSVs que ela consome.
Quando a estrutura de uma planilha muda (nome de aba, cabeçalho, nova aba de
ano), **a página no ar pode quebrar na hora** — por isso as regras abaixo.

---

## 2. Regras gerais (todas as planilhas)

### 2.1 Layout fixo

| Linha | Conteúdo |
|------|----------|
| **1** | Carimbo de atualização — célula **A1** apenas: `DADOS_ATUALIZADOS_EM: dd/mm/aaaa hh:mm` (preenchido automaticamente pelo Apps Script — **não digitar à mão**) |
| **2** | Cabeçalhos das colunas |
| **3 em diante** | Dados |

### 2.2 Nome da aba

- Planilhas **divididas por ano**: uma aba por ano, nome só com os 4 dígitos
  (`2023`, `2024`, `2025`, `2026`), **anos mais recentes à esquerda**.
- Planilhas **não divididas**: aba única chamada `Página1`.
- Nunca usar nome com espaço, acento ou maiúscula fora do padrão acima.

### 2.3 Cabeçalhos (linha 2)

- `snake_case`, **minúsculas, sem acento, sem espaço**: `data_contrato`,
  `valor_global`, `razao_social`.
- O nome do cabeçalho é um **contrato com o código**. Renomear um cabeçalho
  exige ajuste no HTML correspondente — avisar quem mantém o código e
  atualizar a seção 6 deste documento.
- Não inserir colunas "de trabalho" ou rascunho numa aba publicada.

### 2.4 Tipos de célula

| Tipo de dado | Como formatar no Sheets | Exemplo |
|---|---|---|
| **Identificador** (`numero_contrato`, `numero_processo`, `exercicio`, `ano`, `mes`, `matricula`, `cnpj`, `cpf_ou_cnpj`) | **Texto simples** (`Formatar → Número → Texto simples`) | `1/2023`, `TC-005147.989.24`, `2026` |
| **Data** | Data, formato **`dd/mm/aaaa`** (único formato em todas as planilhas) | `10/01/2023` |
| **Data + hora** | Data e hora, `dd/mm/aaaa hh:mm` | `31/08/2026 14:20` |
| **Valor monetário** | **Número puro**, sem `R$` na célula, 2 casas decimais. A página formata como `R$` na exibição. | `50000.00` (não `R$ 50.000,00`) |
| **CPF** (pessoa física) | Gravado **já mascarado**: `***.456.789-**`. O Apps Script mascara sozinho ao digitar (11 dígitos → máscara). | `***.456.789-**` |
| **CNPJ** (pessoa jurídica) | Completo — dado público. | `12.345.678/0001-90` |
| **Campo vazio** | Célula **vazia**. Nunca `-`, `N/A`, `---`, `0` no lugar de "não há". | |

> **Por que CPF mascarado na origem:** o CSV publicado contém exatamente o que
> está na célula. Se o CPF completo estiver na planilha, ele fica público na
> URL do CSV — a máscara do site é só cosmética. A proteção real (LGPD) é
> guardar já mascarado. A `mascararCPF()` nas páginas continua como rede de
> segurança. Vale para toda planilha com CPF (contratos, servidores,
> remuneração…).

> **Por que identificador como texto:** se `1/2023` ficar como data, o Sheets
> guarda internamente `01/01/2023`. O portal só funciona pela formatação de
> exibição — e qualquer mudança de formato quebra ordenação e filtros **sem
> aviso**.

### 2.5 Publicação na web

- Publicar **somente as abas que o portal usa** e **somente as colunas
  públicas**. "Publicar na web" expõe tudo que estiver marcado.
- Cada aba publicada gera uma URL própria com `&gid=NÚMERO`. Guardar essas
  URLs (seção 6).
- Revisar a cada nova aba: nenhuma coluna interna / rascunho foi exposta?

---

## 3. Divisão por abas de ano

Todas as planilhas de acervo são divididas por ano para não crescerem
indefinidamente (download grande + travamento do navegador). A página carrega
o ano corrente por padrão e oferece um seletor para anos anteriores.

**Critério de qual ano (por planilha) — ver seção 6.** Ex.: em `contratos` a
linha vai para a aba do **ano do número do contrato** (`numero_contrato =
5/2023` → aba `2023`), não do ano da assinatura.

Planilhas que são *retrato do momento* (ex.: `servidores` ativos) podem ficar
em aba única — indicado na seção 6.

---

## 4. Passo a passo — criar a aba de um ano novo

Com o Apps Script instalado, use o menu:

1. **Transparência → Criar aba do próximo ano.** Isso clona a estrutura da
   aba mais recente, limpa os dados, põe a nova aba na frente e grava o
   carimbo em A1.
2. Conferir os cabeçalhos na linha 2 (vêm da cópia).
3. Lançar os dados a partir da linha 3.
4. **Publicar a aba:** `Arquivo → Compartilhar → Publicar na web` → selecionar
   a aba do ano novo → *Publicar*.
5. Copiar a URL publicada (contém `&gid=`).
6. Enviar a URL para quem mantém o código **ou**, se você mesmo for editar,
   adicionar a entrada no objeto de URLs no topo do arquivo HTML da página
   (seção 6 indica qual arquivo e a variável) e commitar.
7. Conferir a página no ar: o seletor de ano mostra o ano novo e a tabela
   carrega.

> Sem o passo 4–6 a página **não enxerga** o ano novo — ela só conhece as URLs
> que estão no código.

### Criar a aba manualmente (se não usar o menu)

1. Nova aba, nome = ano com 4 dígitos.
2. A1 fica em branco (o Apps Script carimba sozinho em segundos; ou use
   *Transparência → Carimbar agora*).
3. Linha 2 = copiar os cabeçalhos de outra aba, sem alterar nada.
4. Arrastar a aba para a primeira posição.
5. Seguir do passo 4 acima (publicar).

---

## 4b. Publicar as abas (compartilhamento) — passo a passo

O site lê cada aba por uma URL de **CSV publicado**. "Publicar na web" é
**independente** do botão *Compartilhar* — a planilha pode continuar
**Restrita** (ninguém acessa o arquivo em si); só o CSV daquela aba fica
público.

### Publicar uma aba

1. `Arquivo → Compartilhar → Publicar na web`.
2. Aba **Link**. No 1º seletor, **troque de "Documento inteiro" para a aba
   específica** (ex.: `2026`). ⚠️ Não deixe "Documento inteiro" — isso
   expõe todas as abas, inclusive rascunhos.
3. No 2º seletor, escolha **Valores separados por vírgula (.csv)**.
4. Clique **Publicar** e confirme.
5. Marque **"Republicar automaticamente quando alterações forem feitas"**
   (fica ligado por padrão) — sem isso o CSV congela na versão publicada.
6. Copie a URL. Ela tem o formato:
   `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=NÚMERO&single=true&output=csv`
   O `gid=NÚMERO` identifica a aba.

### Repetir para cada aba de ano

Faça o passo acima para `2026`, `2025`, `2024`, `2023`. Você terá 4 URLs,
uma por ano.

### Colar as URLs no código

No topo do `<script>` de `contratos.html`, no objeto `FONTES_POR_ANO`:

```js
const FONTES_POR_ANO = {
    "2026": "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv",
    "2025": "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=843211&single=true&output=csv",
    "2024": "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=157882&single=true&output=csv",
    "2023": "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=992013&single=true&output=csv",
};
```

Commit → a página passa a mostrar o seletor de ano e a ler as abas.

### Despublicar (se precisar tirar uma aba do ar)

Mesma tela → **Conteúdo publicado e configurações → Parar de publicar**.
A página que aponta para aquela URL passa a mostrar erro de carregamento
(tela vermelha) — remova também a entrada de `FONTES_POR_ANO`.

### Checklist de segurança ao publicar

- [ ] Publiquei **a aba**, não "Documento inteiro".
- [ ] Nenhuma aba de rascunho / trabalho está publicada
      (*Publicar na web → Conteúdo publicado* lista o que está no ar).
- [ ] CPFs já estão mascarados na planilha (rodei *Mascarar CPFs agora* se
      importei dados).
- [ ] Só colunas públicas na aba publicada.

---

## 5. O Apps Script (`apps-script/carimbo.gs`)

**Arquivo único**, colado igual no editor de Apps Script (`Extensões → Apps
Script`) de cada uma das 9 planilhas. Não precisa de ajuste por planilha — ele
detecta sozinho se a planilha é dividida por ano ou de aba única.

### 5.1 O que ele escreve

O texto `DADOS_ATUALIZADOS_EM: dd/mm/aaaa hh:mm` na célula **A1**, com o
**mesmo valor** (o horário mais recente) em todos os alvos:

| Tipo de planilha | Onde carimba |
|---|---|
| Dividida por ano (abas com nome de 4 dígitos) | A1 de **todas** as abas de ano |
| Aba única | A1 da aba `Página1` |

Fuso `America/Sao_Paulo`. Nunca digitar esse valor à mão.

### 5.2 Quando dispara

| Evento | Gatilho | Observação |
|---|---|---|
| Edição manual de qualquer célula (fora da linha 1) | `onEdit` (simples) | não conta edição na própria linha do carimbo |
| Importação, colagem grande, inserção de aba, edição via API/script | `onChange` (instalável) | criado por `criarGatilhos` |
| Reforço periódico | gatilho de tempo | **toda terça-feira, 11h–12h** (constantes `GATILHO_DIA` / `GATILHO_HORA` no topo do `carimbo.gs`; escalone por planilha) |

Trava de 25 s no `CacheService` evita laço (o `onChange` re-disparando por
causa da própria escrita do carimbo). Se A1 já tem o valor calculado, não
reescreve.

### 5.3 Máscara de CPF (LGPD)

Em toda edição manual, um valor de **11 dígitos** numa coluna listada em
`COLUNAS_CPF` (padrão: `cpf_ou_cnpj`, `cpf`, `cpf_cnpj`) é gravado **já
mascarado** (`***.456.789-**`). CNPJ (14 dígitos) e outros valores passam
intactos.

Importação em massa **não passa pelo `onEdit`** — depois de importar, rode
**Transparência → Mascarar CPFs agora**, que varre todas as abas e mascara o
que estiver cru. Ajuste `COLUNAS_CPF` no topo do `carimbo.gs` se a coluna
tiver outro nome.

### 5.4 Menu "Transparência" (aparece após instalar)

- **Criar aba do próximo ano** — só aparece em planilha dividida por ano.
  Clona a estrutura da aba de ano mais recente, limpa os dados (linha 3+),
  mantém os cabeçalhos (linha 2), põe a nova aba na primeira posição e
  carimba a A1. Não publica a aba — ver seção 4.
- **Carimbar agora** — força o carimbo manualmente.
- **Mascarar CPFs agora** — varre todas as abas e mascara CPFs crus.

### 5.5 Instalação (uma vez por planilha)

1. `Extensões → Apps Script`, colar o conteúdo de `carimbo.gs`, salvar.
2. Selecionar a função `criarGatilhos`, Executar, autorizar os acessos.
   Isso remove gatilhos antigos, cria o `onChange` + o semanal, e carimba na hora.
3. Recarregar a planilha — o menu "Transparência" aparece.

### 5.6 O que ele **não** faz

- Não cria a linha 2 (cabeçalhos) de uma aba nova feita manualmente.
- Não lê nem valida cabeçalhos — renomear colunas não afeta o carimbo.
- Não publica abas na web nem atualiza o HTML.

### 5.7 Significado do selo

O selo verde "dados atualizados em…" no portal lê esse valor e significa
*"o portal foi conferido/atualizado nesta data"* — não "as linhas deste ano
mudaram". Por isso o mesmo carimbo em todas as abas, inclusive anos antigos.

---

## 6. Dicionário de colunas por planilha

> Preencher `gid` conforme cada aba for publicada. `[texto]`, `[data]`,
> `[número]`, `[url]` indicam o tipo esperado (seção 2.4).
>
> **Vocabulário:** minúsculo, `snake_case`, por extenso, sem contração.
> Só a planilha **contratos** já está com o vocabulário final; as demais
> abaixo mostram `hoje → proposto` e serão renomeadas no diagnóstico de cada
> uma.

### contratos  — dividir por: **ano do `numero_contrato`**  ✅ vocabulário final
Arquivo HTML: `contratos.html` — **migrado** (lê colunas por nome, valor como
número, `situacao_contrato`, seletor de ano). As 4 abas já estão publicadas e
no `FONTES_POR_ANO` (gid: 2026 `47019203` · 2025 `1922578156` · 2024
`789937754` · 2023 `1300317421`). Ao abrir um ano novo, acrescentar a linha
`"ANO": "URL"` nesse objeto.

| Coluna | Tipo | Observação |
|---|---|---|
| `numero_contrato` | texto | padrão `M/AAAA`, ex. `1/2023` |
| `cpf_ou_cnpj` | texto | |
| `razao_social` | texto | |
| `objeto_contrato` | texto | |
| `data_assinatura` | data | `dd/mm/aaaa` |
| `valor_contrato` | número | sem `R$` |
| `data_fim_vigencia` | data **ou** texto | data `dd/mm/aaaa`; ou `INDETERMINADA`. Se `situacao_contrato = Rescindido`, esta é a data da rescisão. |
| `situacao_contrato` | texto | **vazio** = curso normal (a página calcula "Vigente / Encerrado" pela data). `Rescindido` = encerrado antecipadamente por descumprimento. Fato permanente — não se apaga quando a sanção vence. Sem coluna de motivo (decisão): o motivo fica em `empresas_sancionadas.motivo_sancao` e no PDF via `link_processo_sapl`. |
| `modalidade_licitacao` | texto | |
| `fiscal_contrato` | texto | |
| `link_pdf_contrato` | url | |
| `link_processo_sapl` | url | |

Abas / gid: 2026 `gid=____` · 2025 `gid=____` · 2024 `gid=____` · 2023 `gid=____`

#### Contratos rescindidos (situacao_contrato = Rescindido)

| nº | `data_fim_vigencia` gravada | Portaria de penalidade | Fim da sanção (na `empresas_sancionadas`) |
|---|---|---|---|
| 55/2023 Petromar | 21/03/2024 (data da Portaria — rescisão sem data no doc) | 11/2024 | impedimento 3 anos → 21/03/2027 |
| 57/2023 Web Mídias | 17/04/2024 (rescisão real) | 15/2024 | impedimento **2 anos** → 17/06/2026 |
| 25/2024 Lucas Toniate | 30/07/2024 (rescisão real) | 23/2024 | impedimento 2 anos → 30/09/2026 |
| 6/2025 Soretto | 06/06/2025 (data da Portaria — rescisão sem data no doc) | 7/2025 | impedimento 3 anos → 06/06/2028 |
| 51/2024 Flex Services | *(vazio)* — marca removida | — | **pendência:** não consta na `empresas_sancionadas`; confirmar se houve sanção |

> 3 contratos com `data_fim_vigencia = INDETERMINADA` (32/2023, 33/2023,
> 40/2023 — energia CPFL e Correios) são legítimos, ficam como estão.

**Pendências de conteúdo em `contratos` (corrigir na planilha):**
- 6 CPFs de pessoa física estavam **crus** na planilha antiga → a versão
  normalizada já os gravou mascarados (`***.xxx.xxx-**`).
- 4 CNPJs com erro de digitação: aba 2026 linhas 14 (`06.7871909/0001-18`)
  e 15 (`35.093.155/0001-0`); aba 2025 linhas 62 (`015.655.026/0001-45`)
  e 70 (`67.564.773/001-71`).

> As correções que as Portarias revelaram na planilha `empresas_sancionadas`
> (datas de fim de sanção da Web Mídias e Soretto, linha faltante da Flex)
> estão detalhadas na seção 6, em **empresas_sancionadas** — já aplicadas na
> versão normalizada dessa planilha.

### diárias — dividir por: **ano da `data_partida`** ✅ diagnóstico 01/09/2026
878 registros 2023–2026. Aba `Página1` → abas de ano. Valores já numéricos na
origem. Sem coluna de CPF. Normalizada em `planilhas_normalizadas/diarias.xlsx`.

| Coluna (antigo → padrão) | Tipo | Observação |
|---|---|---|
| `servidor` → `nome_servidor` | texto | |
| `cargo` | texto | traz "Ver. Fulano" — usado pelo filtro de gabinete |
| `qtde_diarias` → `quantidade_diarias` | texto | ex. `2 DIÁRIAS E 2/3 DE DIÁRIA` |
| `data_partida` | data | ano dela = aba |
| `data_retorno` | data | |
| `valor_diarias` | número | sem `R$` |
| `valor_adiantamento` | número | **`0` gravado como célula vazia** (regra 2.4) |
| `dotacao` | texto | **nome mantido** (decisão do usuário). Só `Corpo Administrativo` / `Corpo Legislativo` |
| `local_destino` | texto | |
| `cidade_destino` | texto | |
| `motivacao_viagem` | texto longo | |

> Linhas da mesma viagem repetidas com `dotacao` diferente = **rateio real**, não
> dupla contagem (decisão do usuário — manter).

HTML: `diarias.html` — **a migrar**: comum.css/comum.js, `FONTES_POR_ANO` +
URL de gabinetes, selo `DADOS_ATUALIZADOS_EM`, colunas por nome com aliases dos
nomes antigos, `formatarBRL`, guard B2.

`diarias.html` — filtro **Legislatura** é o seletor principal: carrega de uma vez
todas as abas de ano daquela legislatura (`LEGISLATURAS` no HTML: 21ª = 2025–2028,
20ª = 2021–2024). Depois "Ano" e "Mês" filtram em memória.

Planilha auxiliar `gabinetes` (`planilhas_normalizadas/gabinetes.xlsx`):
**2 colunas** — `gabinete` | `legislatura` (`20` ou `21`, texto). O filtro
"Gabinete" só mostra os vereadores da legislatura carregada.
21ª = os 17 atuais. 20ª = 18 nomes **RASCUNHO** (reconstruídos das diárias 2023–24 +
reeleitos de 2024) — usuário vai confirmar a lista oficial.

Para lançar novos pareceres de diárias (PDF → linhas), usar o prompt pronto em
`prompt-lancar-diarias.txt` (na raiz do repositório).

### empresas_sancionadas — **aba única** (não divide por ano)
A página só mostra sanções **vigentes** (compara `data_fim_sancao` com hoje);
isso exige todas as linhas juntas — dividir por ano quebraria a lógica.
HTML: `empresas_sancionadas.html` — **migrado** (comum.css/comum.js, colunas
por nome, `buscarCSV` com timeout, guard B2). Filtro **Situação**: "vigentes"
(padrão) / "encerradas" / "todas" — calculado de `data_fim_sancao` vs hoje,
nada apagado. Selo verde "Sanção encerrada em…" para as vencidas.

| Coluna (hoje → padrão) | Tipo | Observação |
|---|---|---|
| `cnpj` → `cpf_ou_cnpj` | texto | CNPJ completo; CPF (11 díg) mascarado pelo `carimbo.gs` |
| `razao_social` | texto | |
| `numero_contrato` | texto | padrão `M/AAAA` ou `NN/AAAA` |
| `objeto_contrato` | texto | |
| `motivo_sancao` | texto | |
| `fim_sancao` → `data_fim_sancao` | data | vazio = sanção sem prazo (sempre exibida) |
| `observacao` | texto longo | narrativa da Portaria |

**Correções aplicadas na versão normalizada** (base: Portarias de Ordem):
- **57/2023 Web Mídias** — `data_fim_sancao` 17/06/2027 → **17/06/2026**
  (Portaria 15/2024: impedimento de 2 anos, não 3); observação: "3 (três)
  anos" → "2 (dois) anos". ⚠️ Com a correção a sanção já venceu (2 anos desde
  17/06/2024) → **sai da listagem** (vai para histórico). Correto.
- **6/2025 Soretto** — `data_fim_sancao` 17/06/2027 → **06/06/2028**
  (Portaria 7/2025, publicada 06/06/2025, 3 anos); observação: multa "15%
  (quinze por cento)" → "30% (trinta por cento)", "a contar de 17/06/2024" →
  "a contar de 06/06/2025".
- **55/2023 Petromar** e **25/2024 Lucas Toniate** — sem alteração.
- **Pendência: 51/2024 Flex Services** — marcado "apenado" em `contratos`
  mas sem linha aqui. Confirmar se houve sanção; se sim, adicionar a linha
  com base na Portaria.

### estagiarios — dividir por: *(a definir — cadastro atravessa anos)*
`nome_estagiario` [texto] · `data_admissao` [data] · `data_desligamento` [data, pode ser vazio]

### julgamentos_contas_camara — dividir por: **`exercicio`**
`exercicio` [texto] · `processo` → `numero_processo` [texto] · `julgamento` → `resultado_julgamento` [texto] · `transito_julgado` → `data_transito_julgado` [data] · `itens_irregulares` [texto, pode ser vazio]

### painel_manifestacoes — dividir por: **ano da `data_abertura`**
`tipo` → `tipo_manifestacao` [texto] · `assuntos` → `assunto` [texto] · `canal_entrada` [texto] · `data_abertura` [data] · `municipio` [texto] · `data_conclusao` [data, pode ser vazio]

### painel_orcamentario — dividir por: **`ano`**
`ano` [texto] · `mes` [texto, `JAN`..`DEZ`] · `duodecimo_previsto` [número] · `duodecimo` → `duodecimo_repassado` [número] · `empenhado` → `valor_empenhado` [número] · `liquidado` → `valor_liquidado` [número] · `pago` → `valor_pago` [número] · `resultado` [número]

### remuneracao_detalhada_servidores — dividir por: **`ano`**
Renomear a aba `planilha` → padrão de ano. Cabeçalhos hoje com maiúscula/acento/espaço → renomear todos:
`Ano`→`ano` · `Mês`→`mes` · `Matricula`→`matricula` · `Nome`→`nome_servidor` · `Vencimentos Brutos`→`vencimentos_brutos` · `Referência`→`referencia` · `Vantagens Pessoais`→`vantagens_pessoais` · `Outras Verbas Remuneratórias Legais ou Judiciais`→`outras_verbas_remuneratorias_legais_judiciais` · `Verbas Indenizatórias e/ou Eventuais`→`verbas_indenizatorias_eventuais` · `Auxílio Saúde / Alimentação`→`auxilio_saude_alimentacao` · `Abono de Permanência`→`abono_permanencia` · `Redutor`→`redutor`
Verbas todas em **número** (hoje texto `R$ ...`). A planilha tem 16 colunas — as 4 restantes (13–16) a levantar no diagnóstico.

### servidores — **aba única** (retrato do quadro atual, não divide por ano)
`nome_func` → `nome_funcionario` [texto] · `cargo` [texto] · `lotacao` [texto] · `data_admissao` [data] · `data_demissao` [data, vazio = ativo] · `jornada` [texto]
Remover a 7ª coluna vazia (sem cabeçalho).

---

## 7. Checklist ao mexer numa planilha

- [ ] Linha 1 = só o carimbo em A1; linha 2 = cabeçalhos; dados a partir da 3.
- [ ] Cabeçalhos em `snake_case`, sem acento — se renomeou algum, avisou o código e atualizou a seção 6.
- [ ] Identificadores formatados como **Texto simples**.
- [ ] Datas todas em `dd/mm/aaaa`.
- [ ] Valores monetários como número, sem `R$`.
- [ ] **CPFs mascarados** na planilha (`***.456.789-**`); CNPJ completo.
- [ ] Campos "sem informação" = célula vazia.
- [ ] Publiquei **a aba**, não "Documento inteiro"; nenhum rascunho no ar.
- [ ] Aba nova de ano: publicada, `gid` anotado, URL adicionada ao HTML, página no ar conferida.
