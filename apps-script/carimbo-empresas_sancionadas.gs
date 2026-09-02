/**
 * Portal de Transparência — Câmara Municipal de Marília
 * Carimbo de atualização automático — planilha: empresas sancionadas
 *
 * O QUE ESTE SCRIPT FAZ
 * ----------------------
 * 1. Carimbo — grava em A1 o texto "DADOS_ATUALIZADOS_EM: dd/mm/aaaa hh:mm"
 *    (fuso America/Sao_Paulo). Se a planilha é dividida por abas de ano
 *    (nomes de 4 dígitos: 2023, 2024, ...), carimba a A1 de TODAS elas com
 *    o mesmo valor; se é aba única, carimba a A1 da aba "Página1". Dispara
 *    a cada edição manual (onEdit), a cada importação/colagem grande/
 *    inserção de aba (onChange) e num reforço agendado — nesta planilha,
 *    toda TERÇA-FEIRA, 8h-9h. Uma trava de 25s evita loop entre o carimbo
 *    e o próprio onChange.
 *
 * 2. Máscara de CPF (LGPD) — todo valor de 11 dígitos digitado numa coluna
 *    listada em COLUNAS_CPF é gravado JÁ MASCARADO ("***.456.789-**");
 *    CNPJ (14 dígitos) passa intacto. Assim o CSV publicado nunca expõe
 *    CPF completo. "Mascarar CPFs agora" faz o mesmo em lote, para quando
 *    os dados chegam por importação (que não passa pelo onEdit).
 *
 * 3. Menu "Transparência" (aparece ao abrir a planilha):
 *    - Criar aba do próximo ano — só aparece se já existir aba de ano;
 *      clona a estrutura da mais recente, limpa os dados, carimba e move
 *      a aba nova para a primeira posição.
 *    - Carimbar agora — força o carimbo manualmente.
 *    - Mascarar CPFs agora — varre todas as abas e mascara CPFs crus.
 *
 * INSTALAÇÃO (uma vez, nesta planilha)
 * -------------------------------------
 * 1. Extensões → Apps Script, colar este arquivo inteiro, salvar.
 * 2. Selecionar a função "criarGatilhos", executar, autorizar o acesso.
 * 3. Recarregar a planilha — o menu "Transparência" aparece.
 *
 * Passo a passo completo e agenda de todas as planilhas: ver
 * apps-script/agenda-atualizacoes.md no repositório.
 */

const ROTULO = 'DADOS_ATUALIZADOS_EM';
const TZ = 'America/Sao_Paulo';
const FORMATO = 'dd/MM/yyyy HH:mm';
const LINHA_CABECALHO = 2;
const ABA_ANO = /^\d{4}$/;
const ABA_UNICA = 'Página1';

const GATILHO_FREQUENCIA = 'SEMANAL';
const GATILHO_DIA        = 'TUESDAY';
const GATILHO_HORA       = 8;

const COLUNAS_CPF = ['cpf_ou_cnpj', 'cpf', 'cpf_cnpj'];

function carimbar() {
  const cache = CacheService.getScriptCache();
  if (cache.get('carimbando')) return;
  cache.put('carimbando', '1', 25);

  const texto = ROTULO + ': ' + Utilities.formatDate(new Date(), TZ, FORMATO);

  abasParaCarimbar().forEach(function (sh) {
    const a1 = sh.getRange('A1');
    if (a1.getValue() !== texto) a1.setValue(texto);
  });
}

function reforcoAgendado() {
  if (GATILHO_FREQUENCIA === 'MENSAL_PRIMEIRA_SEGUNDA') {
    var dia = Number(Utilities.formatDate(new Date(), TZ, 'd'));
    if (dia > 7) return;
  }
  carimbar();
}

function onEdit(e) {
  if (e && e.range && e.range.getRow() === 1) return;
  mascararCpfNaEdicao(e);
  carimbar();
}

function onChange(e) {
  carimbar();
}

function mascararCpfValor(v) {
  var d = String(v == null ? '' : v).replace(/\D/g, '');
  if (d.length !== 11) return null;
  return '***.' + d.substr(3, 3) + '.' + d.substr(6, 3) + '-**';
}

function chaveColuna(h) {
  return String(h).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toLowerCase().replace(/\s+/g, '_');
}

function mascararCpfNaEdicao(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  var linIni = e.range.getRow();
  if (linIni < LINHA_CABECALHO + 1) return;
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
           'Passos completos em docs/padrao-planilhas.md.');
}

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

function criarGatilhos() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('onChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('reforcoAgendado')
    .timeBased().everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay[GATILHO_DIA]).atHour(GATILHO_HORA)
    .create();

  carimbar();
}
