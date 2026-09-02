/**
 * Portal de Transparência — Câmara Municipal de Marília
 * Carimbo de atualização + criação de aba de ano
 * Planilha: julgamentos das contas anuais da Câmara
 *
 * Cole este conteúdo no Apps Script (Extensões → Apps Script) DESTA
 * planilha. Cada planilha do portal tem sua própria cópia deste arquivo,
 * ajustada apenas no bloco GATILHO_* abaixo (frequência de reforço do
 * carimbo) — o resto do código é igual em todas.
 *
 * O que faz:
 *
 *  1. Carimbo — grava, na célula A1, o texto:
 *
 *         DADOS_ATUALIZADOS_EM: 31/08/2026 14:20
 *
 *     - Se a planilha tem abas de ano (nome com 4 dígitos: 2023, 2024, ...),
 *       carimba a A1 de TODAS elas, com o mesmo valor.
 *     - Se não tem (planilha de aba única), carimba a A1 da aba "Página1".
 *     Dispara em toda edição manual, importação, inserção de aba e um reforço
 *     agendado (ver GATILHO_FREQUENCIA / GATILHO_DIA / GATILHO_HORA):
 *       - reforço agendado: só na 1ª SEGUNDA-FEIRA do mês, 9h-10h
 *       (os dados mudam ~1x/ano — não precisa de reforço semanal).
 *
 *  2. Máscara de CPF (LGPD) — em toda edição manual, um valor de 11 dígitos
 *     numa coluna de CPF (COLUNAS_CPF) é gravado JÁ MASCARADO
 *     ("***.456.789-**"). CNPJ (14 díg.) passa intacto. Assim o CSV publicado
 *     nunca expõe CPF inteiro — a máscara não depende do site.
 *
 *  3. Menu "Transparência":
 *     - "Criar aba do próximo ano" (só aparece se já houver aba de ano):
 *       clona a estrutura da aba mais recente, zera os dados, põe a nova aba
 *       na frente e carimba.
 *     - "Carimbar agora": força o carimbo.
 *     - "Mascarar CPFs agora": varre todas as abas e mascara CPFs crus
 *       (use depois de importar dados em massa — o onEdit não cobre importação).
 *
 * Instalação (uma vez, nesta planilha):
 *   1. Extensões → Apps Script, cole este arquivo, salve.
 *   2. Rode a função "criarGatilhos", autorize.
 *   3. Recarregue a planilha (menu "Transparência" aparece).
 *
 * Passos de publicação de aba nova: ver docs/padrao-planilhas.md no repositório.
 */

const ROTULO = 'DADOS_ATUALIZADOS_EM';
const TZ = 'America/Sao_Paulo';
const FORMATO = 'dd/MM/yyyy HH:mm';
const LINHA_CABECALHO = 2;        // 1 = carimbo, 2 = cabeçalhos, 3+ = dados
const ABA_ANO = /^\d{4}$/;
const ABA_UNICA = 'Página1';      // usada quando a planilha não é dividida por ano

// Reforço agendado do carimbo (gatilho de tempo criado por criarGatilhos).
// GATILHO_FREQUENCIA:
//   'SEMANAL'                  → toda semana no GATILHO_DIA.
//   'MENSAL_PRIMEIRA_SEGUNDA'  → só na 1ª segunda-feira do mês.
// GATILHO_DIA: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
// GATILHO_HORA: 0–23. atHour(N) = a janela "Nh às N+1h" no editor de gatilhos.
const GATILHO_FREQUENCIA = 'MENSAL_PRIMEIRA_SEGUNDA';
const GATILHO_DIA        = 'MONDAY';
const GATILHO_HORA       = 9;

// Colunas cujo valor deve ser gravado JÁ MASCARADO quando for CPF (11 dígitos).
// CNPJ (14 dígitos) e qualquer outro valor passam sem alteração.
// Ajuste os nomes conforme a planilha (ex.: "cpf", "cpf_ou_cnpj").
const COLUNAS_CPF = ['cpf_ou_cnpj', 'cpf', 'cpf_cnpj'];

/* ------------------------------------------------------------------ */
/* 1. CARIMBO                                                          */
/* ------------------------------------------------------------------ */

function carimbar() {
  const cache = CacheService.getScriptCache();
  if (cache.get('carimbando')) return;          // evita laço com o próprio onChange
  cache.put('carimbando', '1', 25);

  const texto = ROTULO + ': ' + Utilities.formatDate(new Date(), TZ, FORMATO);

  abasParaCarimbar().forEach(function (sh) {
    const a1 = sh.getRange('A1');
    if (a1.getValue() !== texto) a1.setValue(texto);
  });
}

/** Alvo do gatilho de tempo. No modo 'MENSAL_PRIMEIRA_SEGUNDA' só carimba
    quando a data do dia é 1–7 (ou seja, a 1ª segunda-feira do mês); nos
    demais dias/semanas o gatilho dispara e não faz nada. As edições manuais,
    importações e o menu "Carimbar agora" chamam carimbar() direto e não
    passam por aqui. */
function reforcoAgendado() {
  if (GATILHO_FREQUENCIA === 'MENSAL_PRIMEIRA_SEGUNDA') {
    var dia = Number(Utilities.formatDate(new Date(), TZ, 'd'));
    if (dia > 7) return;
  }
  carimbar();
}

/** Edições manuais (gatilho simples). */
function onEdit(e) {
  if (e && e.range && e.range.getRow() === 1) return;   // ignora a própria linha do carimbo
  mascararCpfNaEdicao(e);
  carimbar();
}

/** Importações, colagens grandes, inserção de aba, edições via API (gatilho instalável). */
function onChange(e) {
  carimbar();
  // onChange não informa a célula editada; para importações em massa,
  // rode "Transparência → Mascarar CPFs agora".
}

/* ------------------------------------------------------------------ */
/* 1b. MÁSCARA DE CPF (LGPD)                                           */
/*     O valor é gravado mascarado NA PLANILHA — não depende do site.  */
/* ------------------------------------------------------------------ */

/** "12345678901" (11 díg.) → "***.456.789-**". Outros tamanhos: retorna null. */
function mascararCpfValor(v) {
  var d = String(v == null ? '' : v).replace(/\D/g, '');
  if (d.length !== 11) return null;
  return '***.' + d.substr(3, 3) + '.' + d.substr(6, 3) + '-**';
}

function chaveColuna(h) {
  return String(h).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toLowerCase().replace(/\s+/g, '_');
}

/** Mascara CPFs na faixa recém-editada (gatilho onEdit). */
function mascararCpfNaEdicao(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  var linIni = e.range.getRow();
  if (linIni < LINHA_CABECALHO + 1) return;             // não mexe em cabeçalho/carimbo
  if (sh.getLastColumn() < 1) return;

  var cabecalhos = sh.getRange(LINHA_CABECALHO, 1, 1, sh.getLastColumn())
    .getValues()[0].map(chaveColuna);

  var colIni = e.range.getColumn();
  var vals = e.range.getValues();
  var mudou = false;

  for (var i = 0; i < vals.length; i++) {
    for (var j = 0; j < vals[i].length; j++) {
      if (COLUNAS_CPF.indexOf(cabecalhos[colIni - 1 + j]) === -1) continue;
      var m = mascararCpfValor(vals[i][j]);
      if (m && m !== String(vals[i][j])) { vals[i][j] = m; mudou = true; }
    }
  }
  if (mudou) e.range.setValues(vals);
}

/** Varre TODAS as abas e mascara qualquer CPF cru nas colunas de CPF.
    Use após importar dados em massa. */
function mascararCpfsTudo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var total = 0;
  ss.getSheets().forEach(function (sh) {
    var nome = sh.getName().trim();
    if (!ABA_ANO.test(nome) && nome !== ABA_UNICA) return;
    var ultLin = sh.getLastRow(), ultCol = sh.getLastColumn();
    if (ultLin <= LINHA_CABECALHO || ultCol < 1) return;

    var cab = sh.getRange(LINHA_CABECALHO, 1, 1, ultCol).getValues()[0].map(chaveColuna);
    var alvos = [];
    cab.forEach(function (c, idx) { if (COLUNAS_CPF.indexOf(c) !== -1) alvos.push(idx + 1); });
    if (!alvos.length) return;

    alvos.forEach(function (col) {
      var faixa = sh.getRange(LINHA_CABECALHO + 1, col, ultLin - LINHA_CABECALHO, 1);
      var vs = faixa.getValues();
      var mudou = false;
      for (var i = 0; i < vs.length; i++) {
        var m = mascararCpfValor(vs[i][0]);
        if (m && m !== String(vs[i][0])) { vs[i][0] = m; mudou = true; total++; }
      }
      if (mudou) faixa.setValues(vs);
    });
  });
  SpreadsheetApp.getUi().alert(total + ' CPF(s) mascarado(s).');
}

/* ------------------------------------------------------------------ */
/* 2. MENU / NOVO ANO                                                  */
/* ------------------------------------------------------------------ */

function onOpen() {
  const menu = SpreadsheetApp.getUi().createMenu('Transparência');
  if (abasDeAno().length) {
    menu.addItem('Criar aba do próximo ano', 'criarAbaProximoAno');
  }
  menu.addItem('Carimbar agora', 'carimbar');
  menu.addItem('Mascarar CPFs agora', 'mascararCpfsTudo');
  menu.addToUi();
}

function criarAbaProximoAno() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const anos = abasDeAno().map(function (sh) { return parseInt(sh.getName(), 10); });
  if (!anos.length) { ui.alert('Esta planilha não é dividida por ano.'); return; }

  const ultimo = Math.max.apply(null, anos);
  const novo = ultimo + 1;
  if (ss.getSheetByName(String(novo))) { ui.alert('A aba ' + novo + ' já existe.'); return; }

  const resp = ui.alert('Criar a aba ' + novo + ' a partir da estrutura de ' + ultimo + '?',
                        ui.ButtonSet.OK_CANCEL);
  if (resp !== ui.Button.OK) return;

  const base = ss.getSheetByName(String(ultimo));
  const nova = base.copyTo(ss).setName(String(novo));

  const ultLinha = nova.getMaxRows();
  if (ultLinha >= LINHA_CABECALHO + 1) {
    nova.getRange(LINHA_CABECALHO + 1, 1, ultLinha - LINHA_CABECALHO, nova.getMaxColumns())
        .clearContent();
  }
  if (nova.getFilter()) nova.getFilter().remove();

  ss.setActiveSheet(nova);
  ss.moveActiveSheet(1);
  nova.getRange('A1').setValue(ROTULO + ': ' + Utilities.formatDate(new Date(), TZ, FORMATO));

  ui.alert('Aba ' + novo + ' criada.\n\nAgora: Arquivo → Compartilhar → Publicar na web, ' +
           'selecione a aba ' + novo + ', copie a URL (contém &gid=) e envie para atualizar o HTML. ' +
           'Passos completos em padrao-planilhas.md.');
}

/* ------------------------------------------------------------------ */
/* AUXILIARES                                                          */
/* ------------------------------------------------------------------ */

function abasDeAno() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(function (sh) {
    return ABA_ANO.test(sh.getName().trim());
  });
}

function abasParaCarimbar() {
  const anos = abasDeAno();
  if (anos.length) return anos;
  const unica = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_UNICA);
  return unica ? [unica] : [];
}

/** Rode UMA vez, na mão, para instalar os gatilhos. */
function criarGatilhos() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('onChange').forSpreadsheet(ss).onChange().create();
  // Reforço agendado — frequência/dia/hora em GATILHO_FREQUENCIA / GATILHO_DIA
  // / GATILHO_HORA no topo. O gatilho é sempre semanal; no modo
  // 'MENSAL_PRIMEIRA_SEGUNDA' a função reforcoAgendado ignora as semanas 2–5.
  ScriptApp.newTrigger('reforcoAgendado')
    .timeBased().everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay[GATILHO_DIA]).atHour(GATILHO_HORA)
    .create();

  carimbar();
}
