const URL_D = "https://docs.google.com/spreadsheets/d/1XP67Ojd_HK3S1IPvC_9eY32-lf0_qI3jfBfrLzasvQo/export?format=csv";
const URL_G = "https://docs.google.com/spreadsheets/d/1GwDig1yn9YIX8FSsHFPHL2iLCtwsZkNnquNjp5D7Oaw/export?format=csv";
let dadosBrutos = [], listaGabinetes = [], grid;

async function carregarDados() {
    $('#loader').show(); $('#main-content').hide();
    try {
        const [rD, rG] = await Promise.all([fetch(`${URL_D}&t=${Date.now()}`), fetch(`${URL_G}&t=${Date.now()}`)]);
        const textoD = await rD.text(); processarDados(textoD);
        const textoG = await rG.text(); listaGabinetes = textoG.trim().split("\n").slice(1).map(l => l.replace(/"/g, '').trim().toUpperCase());
        popularSelects(); filtrar();
        $('#loader').hide(); $('#main-content').fadeIn(400, ajustarIframe);
    } catch (e) { alert("Erro de conexão com os dados."); }
}

function processarDados(csv) {
    const linhas = csv.trim().split("\n");
    const match = csv.match(/MODIF_REAL:\s*(\d{2}\/\d{2}\/\d{4}[^\d]+\d{2}:\d{2})/i);
    if(match) $('#sync-info').text(`🟢 Atualizado em: ${match[1]}`);
    const cab = linhas[1].split(',').map(c => c.replace(/"/g, '').toLowerCase().trim());
    
    dadosBrutos = linhas.slice(2).map(l => {
        const cols = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let o = {}; cab.forEach((c, i) => o[c] = (cols[i] || "").replace(/"/g, '').trim());
        if(o.servidor) o.servidor = o.servidor.toUpperCase();
        
        // OTIMIZAÇÃO: Pré-processamento de strings para não sobrecarregar o filtro
        o.busca_nome = o.servidor ? o.servidor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        o.busca_cargo = o.cargo ? o.cargo.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        o.busca_servidor_upper = o.servidor ? o.servidor.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        
        return o;
    }).filter(d => d.servidor);
}

function popularSelects() {
    $('#selGabinete').html('<option value="">Gabinete</option>');
    [...new Set(listaGabinetes)].sort().forEach(g => $('#selGabinete').append(new Option(g, g)));
    
    $('#selServidor').html('<option value="">Servidor</option>');
    [...new Set(dadosBrutos.map(d => d.servidor))].sort().forEach(s => $('#selServidor').append(new Option(s, s)));
    
    const anos = [...new Set(dadosBrutos.map(d => d.data_partida.split('/')[2]))].filter(a => a).sort((a,b)=>b-a);
    $('#selAno').html('<option value="">Ano</option>');
    anos.forEach(a => $('#selAno').append(new Option(a, a)));

    if(anos.length > 0) {
        $('#selAno').val(anos[0]);
    }
}

function filtrar() {
    // Agora o filtro usa as strings pré-processadas
    const n = $('#buscaNome').val().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const g = $('#selGabinete').val() ? $('#selGabinete').val().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const s = $('#selServidor').val(), m = $('#selMes').val(), a = $('#selAno').val();
    
    const res = dadosBrutos.filter(d => {
        const dp = d.data_partida.split('/');
        return (!n || d.busca_nome.includes(n)) && 
               (!g || d.busca_servidor_upper.includes(g) || d.busca_cargo.includes(g)) && 
               (!s || d.servidor === s) && 
               (!m || dp[1] === m) && 
               (!a || dp[2] === a);
    });
    
    renderizarGrid(res);
}

function renderizarGrid(dados) {
    if (grid) { grid.destroy(); $('#area-length').empty(); }
    grid = $('#tabela-base').DataTable({
        data: dados, pageLength: 10, ordering: false,
        dom: 'lrt<"controles-datatable"ip>',
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json', lengthMenu: "Exibir _MENU_ resultados" },
        columns: [{
            data: null,
            render: d => `
                <div class="card-diaria">
                    <div class="card-header"><span class="card-nome">${d.servidor}</span><span class="card-cargo">${d.cargo || "-"}</span></div>
                    <div class="card-body">
                        <div><label class="item-label">Diárias</label><span class="item-valor">${d.qtde_diarias}</span></div>
                        <div><label class="item-label">Partida</label><span class="item-valor">${d.data_partida}</span></div>
                        <div><label class="item-label">Retorno</label><span class="item-valor">${d.data_retorno}</span></div>
                    </div>
                    <div class="card-body sep">
                        <div><label class="item-label">Valor Diárias</label><span class="item-valor">${formatarMoeda(d.valor_diarias)}</span></div>
                        <div><label class="item-label">Adiantamento</label><span class="item-valor">${formatarMoeda(d.valor_adiantamento)}</span></div>
                        <div><label class="item-label">Dotação</label><span class="item-valor">${d.dotacao || "-"}</span></div>
                    </div>
                    <div class="card-footer">
                        <div><label class="item-label">Cidade de Destino</label><span class="item-valor">${d.cidade_destino || "-"}</span></div>
                        <div><label class="item-label">Local de Destino</label><span class="item-valor">${d.local_destino || "-"}</span></div>
                        <div class="quadro-full">
                            <label class="item-label">Motivação da Viagem</label>
                            <span style="font-size:13px; font-weight:500; color:#334155; display:block; margin-top:4px; line-height:1.4;">${d.motivacao_viagem || "-"}</span>
                        </div>
                    </div>
                </div>`
        }],
        initComplete: function() { $('.dataTables_length').appendTo('#area-length'); },
        drawCallback: function() {
            let sD = 0, sA = 0;
            const parse = v => parseFloat((v || "0").replace(/R\$\s?|[.]/g, '').replace(',', '.')) || 0;
            this.api().rows({filter:'applied'}).data().each(d => { sD += parse(d.valor_diarias); sA += parse(d.valor_adiantamento); });
            const f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
            $('#txt-total-diarias').text(f.format(sD)); $('#txt-total-adiantamentos').text(f.format(sA));
            $('#count-rows').text(this.api().rows({filter:'applied'}).count());
            ajustarIframe();
        }
    });

    grid.on('page.dt', function () {
        setTimeout(function() {
            document.getElementById('painel-visualizacao').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    });
}

function formatarMoeda(v) { return (!v || v === "0") ? "R$ 0,00" : (v.includes("R$") ? v : `R$ ${v}`); }
function ajustarIframe() { window.parent.postMessage({ tipo: 'ajustarAltura', valor: document.getElementById('wrapper').offsetHeight + 40 }, '*'); }

function resetarFiltros() { 
    $('#buscaNome').val(''); 
    $('select').not('#selAno').val(''); 
    const anoMaisRecente = $('#selAno option:eq(1)').val();
    $('#selAno').val(anoMaisRecente || '');
    filtrar(); 
}

function gerarNomeArquivoBase() {
    let partes = ["diarias"];
    const serv = $('#selServidor').val();
    const gab = $('#selGabinete').val();
    if (serv) partes.push(serv.replace(/\s+/g, '_'));
    else if (gab) partes.push(gab.replace(/\s+/g, '_'));
    if ($('#selMes').val()) partes.push($('#selMes option:selected').text());
    if ($('#selAno').val()) partes.push($('#selAno').val());
    return partes.join('_').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function exportarExcel() { const ws = XLSX.utils.json_to_sheet(grid.rows({filter:'applied'}).data().toArray()); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Diarias"); XLSX.writeFile(wb, gerarNomeArquivoBase() + ".xlsx"); }
function exportarCSV() { let csv = "\ufeffServidor,Cargo,Diarias,Partida,Retorno,Valor,Adiantamento\n"; grid.rows({filter:'applied'}).data().each(d => { csv += `"${d.servidor}","${d.cargo}","${d.qtde_diarias}","${d.data_partida}","${d.data_retorno}","${d.valor_diarias}","${d.valor_adiantamento}"\n`; }); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = gerarNomeArquivoBase() + ".csv"; link.click(); }
function exportarJSON() { const blob = new Blob([JSON.stringify(grid.rows({filter:'applied'}).data().toArray(), null, 2)], {type: 'application/json'}); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = gerarNomeArquivoBase() + ".json"; link.click(); }
// BUG CORRIGIDO: GEAR_NAME_BASE() substituído por gerarNomeArquivoBase()
function exportarXML() { let xml = '<?xml version="1.0" encoding="UTF-8"?><relatorio>'; grid.rows({filter:'applied'}).data().each(d => { xml += `<registro><servidor>${d.servidor}</servidor><valor>${d.valor_diarias}</valor></registro>`; }); xml += '</relatorio>'; const blob = new Blob([xml], { type: 'application/xml' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = gerarNomeArquivoBase() + ".xml"; link.click(); }

function imprimirSeguro() {
    if(!grid) return;
    const len = grid.page.len();
    grid.page.len(-1).draw('page'); 
    setTimeout(() => { window.print(); grid.page.len(len).draw('page'); }, 500);
}

// Inicialização com atributos defer no HTML exige que esperemos o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    $('#buscaNome').on('input', filtrar);
    $('select').on('change', filtrar);
    carregarDados();
});