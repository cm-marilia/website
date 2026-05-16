(function() {
    // 1. Injetar o HTML base na DIV do Plone
    const container = document.getElementById('container-diarias');
    if (!container) return;

    container.innerHTML = `
        <div id="wrapper-widget">
            <fieldset class="painel-widget">
                <legend class="titulo-painel-w">Filtros de Pesquisa</legend>
                <div id="sync-info-w" class="badge-sinc-w">Sincronizando...</div>
                <div class="grid-filtros-w">
                    <input type="text" id="buscaNome" placeholder="Pesquisar por nome...">
                    <select id="selGabinete"><option value="">Gabinete (Todos)</option></select>
                    <select id="selServidor"><option value="">Servidor (Todos)</option></select>
                    <select id="selMes"><option value="">Mês (Todos)</option><option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option><option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option><option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option></select>
                    <select id="selAno"><option value="">Ano (Todos)</option></select>
                    <button onclick="resetarFiltros()">Limpar Filtros</button>
                </div>
            </fieldset>

            <fieldset class="painel-widget">
                <legend class="titulo-painel-w">Exportação e Ações</legend>
                <div class="grid-botoes-w">
                    <button onclick="exportarCSV()">⬇️ CSV</button>
                    <button onclick="exportarExcel()">⬇️ Excel</button>
                    <button onclick="exportarJSON()">⬇️ JSON</button>
                    <button onclick="exportarXML()">⬇️ XML</button>
                    <button class="btn-destaque-w" onclick="window.print()">🖨️ Imprimir</button>
                    <button class="btn-destaque-w" onclick="carregarDados()">🔄 Atualizar</button>
                </div>
            </fieldset>

            <div class="totais-container-w">
                <div class="total-box-w"><label>Soma das Diárias (Filtrado)</label><span id="txt-total-diarias">R$ 0,00</span></div>
                <div class="total-box-w azul-w"><label>Soma dos Adiantamentos (Filtrado)</label><span id="txt-total-adiantamentos">R$ 0,00</span></div>
            </div>

            <fieldset class="painel-widget">
                <legend class="titulo-painel-w">Visualização</legend>
                <div class="visualizacao-header-w">
                    <div id="dt-length-place"></div>
                    <div class="registros-badge-w"><span id="count-rows">0</span> registros encontrados</div>
                </div>
            </fieldset>

            <table id="tabela-base" style="width:100%">
                <thead><tr><th>Dados</th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    // 2. Injetar o CSS necessário dinamicamente para não misturar com o Plone
    const estilos = document.createElement('style');
    estilos.innerHTML = `
        #wrapper-widget { color: #1e293b; margin-top: 15px; }
        .painel-widget { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; position: relative; }
        .titulo-painel-w { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; padding: 0 10px; letter-spacing: 1px; }
        .badge-sinc-w { position: absolute; top: -12px; right: 20px; font-size: 10px; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; border: 1px solid #a7f3d0; font-weight: 700; }
        .grid-filtros-w { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .grid-botoes-w { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
        #wrapper-widget select, #wrapper-widget input, #wrapper-widget button { height: 42px; border-radius: 8px; border: 1px solid #cbd5e1; padding: 0 12px; font-size: 14px; box-sizing: border-box; width: 100%; }
        #wrapper-widget button { background: #003b75; color: white; font-weight: 600; cursor: pointer; border: none; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap; }
        #wrapper-widget button:hover { background: #00274d; }
        .btn-destaque-w { background: #0284c7 !important; }
        .totais-container-w { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .total-box-w { background: white; border: 1px solid #e2e8f0; border-left: 5px solid #003b75; border-radius: 12px; padding: 15px 20px; }
        .total-box-w.azul-w { border-left-color: #0284c7; }
        .total-box-w label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 5px; }
        .total-box-w span { font-size: 24px; font-weight: 800; color: #1e293b; }
        .visualizacao-header-w { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .registros-badge-w { background: #e0f2fe; color: #0369a1; padding: 10px 25px; border-radius: 10px; font-weight: 700; border: 1px solid #bae6fd; font-size: 14px; }
        #tabela-base thead { display: none !important; }
        table.dataTable { border: none !important; margin-top: 10px !important; }
        .card-diaria { background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; text-align: left; }
        .card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #fff; }
        .card-nome { font-size: 18px; font-weight: 800; color: #003b75; text-transform: uppercase; display: block; }
        .card-cargo { font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; }
        .card-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 15px 20px; gap: 15px; }
        .card-grid.separador { border-top: 1px dashed #f1f5f9; }
        .card-item label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .card-item span { font-size: 14px; font-weight: 700; color: #1e293b; }
        .card-footer { background: #f8fafc; padding: 15px 20px; border-top: 1px solid #edf2f7; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .quadro-cheio { grid-column: 1 / -1; border-top: 1px dashed #e2e8f0; padding-top: 10px; }
        .controles-inferiores { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 10px; margin-bottom: 30px; }
        @media (max-width: 850px) {
            .grid-filtros-w, .grid-botoes-w, .totais-container-w { grid-template-columns: 1fr; }
            .card-grid { grid-template-columns: 1fr 1fr; }
        }
    `;
    document.head.appendChild(estilos);

    // 3. Importar dinamicamente as bibliotecas necessárias caso a página pai não tenha
    function carregarScript(url, callback) {
        let script = document.createElement("script");
        script.type = "text/javascript";
        script.src = url;
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Executa a lógica da planilha após garantir o jQuery e DataTables
    carregarScript("https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js", function() {
        carregarScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", function() {
            initPlanilhaLógica();
        });
    });

    // --- LÓGICA INTERNA DA PLANILHA ---
    function initPlanilhaLógica() {
        const URL_DIARIAS = "https://docs.google.com/spreadsheets/d/1XP67Ojd_HK3S1IPvC_9eY32-lf0_qI3jfBfrLzasvQo/export?format=csv";
        const URL_GABINETES = "https://docs.google.com/spreadsheets/d/1GwDig1yn9YIX8FSsHFPHL2iLCtwsZkNnquNjp5D7Oaw/export?format=csv";
        let dadosBrutos = [], listaGabinetes = [], grid;

        window.carregarDados = async function() {
            try {
                const [rD, rG] = await Promise.all([fetch(`${URL_DIARIAS}&t=${Date.now()}`), fetch(`${URL_GABINETES}&t=${Date.now()}`)]);
                const textoD = await rD.text(); processarDados(textoD);
                const textoG = await rG.text(); listaGabinetes = textoG.trim().split("\n").slice(1).map(l => l.replace(/"/g, '').trim().toUpperCase());
                popularSelects(); filtrar();
            } catch (e) { console.error("Erro ao carregar dados."); }
        }

        function processarDados(csv) {
            const linhas = csv.trim().split("\n");
            const match = csv.match(/MODIF_REAL:\s*(\d{2}\/\d{2}\/\d{4}[^\d]+\d{2}:\d{2})/i);
            if(match) jQuery('#sync-info-w').text(`🟢 Atualizado em ${match[1]}`);
            const cab = linhas[1].split(',').map(c => c.replace(/"/g, '').toLowerCase().trim());
            dadosBrutos = linhas.slice(2).map(l => {
                const cols = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                let o = {}; cab.forEach((c, i) => o[c] = (cols[i] || "").replace(/"/g, '').trim());
                if(o.servidor) o.servidor = o.servidor.toUpperCase();
                return o;
            }).filter(d => d.servidor);
        }

        function popularSelects() {
            jQuery('#selGabinete').html('<option value="">Gabinete (Todos)</option>');
            [...new Set(listaGabinetes)].sort().forEach(g => jQuery('#selGabinete').append(new Option(g, g)));
            jQuery('#selServidor').html('<option value="">Servidor (Todos)</option>');
            [...new Set(dadosBrutos.map(d => d.servidor))].sort().forEach(s => jQuery('#selServidor').append(new Option(s, s)));
            const anos = [...new Set(dadosBrutos.map(d => d.data_partida.split('/')[2]))].filter(a => a).sort((a,b)=>b-a);
            jQuery('#selAno').html('<option value="">Ano (Todos)</option>');
            anos.forEach(a => jQuery('#selAno').append(new Option(a, a)));
        }

        window.filtrar = function() {
            const n = jQuery('#buscaNome').val().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const g = jQuery('#selGabinete').val(), s = jQuery('#selServidor').val(), m = jQuery('#selMes').val(), a = jQuery('#selAno').val();
            const res = dadosBrutos.filter(d => {
                const dp = d.data_partida.split('/');
                const sn = d.servidor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return (!n || sn.includes(n)) && (!g || d.servidor.includes(g) || (d.cargo && d.cargo.includes(g))) && (!s || d.servidor === s) && (!m || dp[1] === m) && (!a || dp[2] === a);
            });
            renderizarGrid(res);
        }

        function renderizarGrid(dados) {
            if (grid) { grid.destroy(); jQuery('#dt-length-place').empty(); }
            grid = jQuery('#tabela-base').DataTable({
                data: dados, pageLength: 10, ordering: false,
                dom: 'lrt<"controles-inferiores"ip>',
                language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json', lengthMenu: "Exibir _MENU_ resultados" },
                columns: [{
                    data: null,
                    render: d => `
                        <div class="card-diaria">
                            <div class="card-header"><span class="card-nome">${d.servidor}</span><span class="card-cargo">${d.cargo || "-"}</span></div>
                            <div class="card-grid">
                                <div class="card-item"><label>Diárias</label><span>${d.qtde_diarias}</span></div>
                                <div class="card-item"><label>Partida</label><span>${d.data_partida}</span></div>
                                <div class="card-item"><label>Retorno</label><span>${d.data_retorno}</span></div>
                            </div>
                            <div class="card-grid separador">
                                <div class="card-item"><label>Valor Diárias</label><span>${formatarMoeda(d.valor_diarias)}</span></div>
                                <div class="card-item"><label>Adiantamento</label><span>${formatarMoeda(d.valor_adiantamento)}</span></div>
                                <div class="card-item"><label>Dotação</label><span>${d.dotacao || "-"}</span></div>
                            </div>
                            <div class="card-footer">
                                <div class="card-item"><label>Cidade Destino</label><span>${d.cidade_destino}</span></div>
                                <div class="card-item"><label>Local Destino</label><span>${d.local_destino}</span></div>
                                <div class="quadro-cheio card-item"><label>Motivação</label><span style="font-weight:500; font-size:12px;">${d.motivacao_viagem}</span></div>
                            </div>
                        </div>`
                }],
                initComplete: function() { jQuery('.dataTables_length').appendTo('#dt-length-place'); },
                drawCallback: function() {
                    let sD = 0, sA = 0;
                    const parse = v => parseFloat((v || "0").replace(/R\$\s?|[.]/g, '').replace(',', '.')) || 0;
                    this.api().rows({filter:'applied'}).data().each(d => { sD += parse(d.valor_diarias); sA += parse(d.valor_adiantamento); });
                    const f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
                    jQuery('#txt-total-diarias').text(f.format(sD)); jQuery('#txt-total-adiantamentos').text(f.format(sA));
                    jQuery('#count-rows').text(this.api().rows({filter:'applied'}).count());
                }
            });
        }

        function formatarMoeda(v) { return (!v || v === "0") ? "R$ 0,00" : (v.includes("R$") ? v : `R$ ${v}`); }
        window.resetarFiltros = function() { jQuery('#buscaNome').val(''); jQuery('select').val(''); filtrar(); }
        
        window.exportarExcel = function() { const ws = XLSX.utils.json_to_sheet(grid.rows({filter:'applied'}).data().toArray()); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Diarias"); XLSX.writeFile(wb, "diarias.xlsx"); }
        window.exportarCSV = function() { let csv = "\\ufeffServidor,Cargo,Diarias,Partida,Retorno,Valor,Adiantamento\\n"; grid.rows({filter:'applied'}).data().each(d => { csv += \`"\${d.servidor}","\${d.cargo}","\${d.qtde_diarias}","\${d.data_partida}","\${d.data_retorno}","\${d.valor_diarias}","\${d.valor_adiantamento}"\\n\`; }); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "diarias.csv"; link.click(); }
        window.exportarJSON = function() { const blob = new Blob([JSON.stringify(grid.rows({filter:'applied'}).data().toArray(), null, 2)], {type: 'application/json'}); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "diarias.json"; link.click(); }
        window.exportarXML = function() { let xml = '<?xml version="1.0" encoding="UTF-8"?><relatorio>'; grid.rows({filter:'applied'}).data().each(d => { xml += `<registro><servidor>\${d.servidor}</servidor><valor>\${d.valor_diarias}</valor></registro>`; }); xml += '</relatorio>'; const blob = new Blob([xml], { type: 'application/xml' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "diarias.xml"; link.click(); }

        jQuery('#buscaNome').on('input', filtrar);
        jQuery('select').on('change', filtrar);
        carregarDados();
    }
})();
