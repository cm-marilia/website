/* =========================================================================
   comum.js — funções compartilhadas das páginas do Portal de Transparência
   Câmara Municipal de Marília

   O QUE ESTE ARQUIVO OFERECE
   - Utilitários de texto e segurança: removerAcentos, escapeHtml,
     escapeXml, urlValida, mascararCPF
   - Datas: parseDataBR, dataParaTimestamp, formatarDataBR
     (aceitam dd/mm/aaaa, aaaa-mm-dd e dd-mm-aaaa, com hora opcional)
   - Números/CSV: parseNumeroBR, formatarBRL, buscarCSV (fetch com timeout),
     indexarColunas (mapa nome→posição, para busca de coluna por nome)
   - Comunicação com o iframe: enviarAlturaIframe() + observador automático
   - Download e exportações: Exportar.csv / .xlsx / .json / .xml

   COMO USAR NUMA PÁGINA
   1. Antes deste script, defina o domínio que embute o iframe:
        <script>window.ORIGEM_PAI = "https://www.marilia.sp.leg.br";</script>
   2. Carregue as bibliotecas (jQuery, DataTables, SheetJS, PapaParse) e,
      em seguida, este arquivo:
        <script src="comum.js"></script>
   3. A página cuida apenas do que é específico dela: ler a planilha,
      montar os filtros e desenhar os cards/tabela.

   As exportações recebem uma lista de objetos já prontos para publicação
   (rótulos legíveis, CPF mascarado, links validados) e um nome de arquivo:
        Exportar.csv(linhas, "contratos_vigente_2026");
   ========================================================================= */
(function (global) {
    "use strict";

    /* ---------------------------------------------------------------------
       1. TEXTO E SEGURANÇA
       --------------------------------------------------------------------- */

    /** Remove acentos ("Razão" → "Razao"). Usado em comparações e buscas. */
    function removerAcentos(str) {
        return str ? String(str).normalize("NFD").replace(/[̀-ͯ]/g, "") : "";
    }

    /** Escapa caracteres HTML antes de inserir dados da planilha na página
        (impede que uma célula com tags/script quebre o layout ou execute
        código — XSS). */
    function escapeHtml(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** Escapa os caracteres reservados do XML na exportação. */
    function escapeXml(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    /** Só aceita links que sejam URLs http/https de verdade. Evita que uma
        célula da planilha injete um link malicioso (ex.: javascript:...). */
    function urlValida(u) {
        return /^https?:\/\//i.test(String(u || "").trim());
    }

    /** LGPD: mascara CPF de pessoa física (***.123.456-**), preservando só
        os dígitos centrais. CNPJ (14 dígitos) é dado público e retorna sem
        alteração. Deve ser aplicado na TELA e em TODAS as exportações. */
    function mascararCPF(doc) {
        if (!doc) return "";
        var numeros = String(doc).replace(/\D/g, "");
        if (numeros.length === 11) {
            return "***." + numeros.substring(3, 6) + "." + numeros.substring(6, 9) + "-**";
        }
        return doc;
    }

    /* ---------------------------------------------------------------------
       2. DATAS
       Aceitam dd/mm/aaaa, aaaa-mm-dd e dd-mm-aaaa. A parte de hora, se
       houver ("dd/mm/aaaa 14:30" ou "aaaa-mm-ddThh:mm"), é ignorada.
       --------------------------------------------------------------------- */

    /** Converte uma data em texto para um objeto Date (meia-noite, hora
        local). Retorna null se não for uma data reconhecível. */
    function parseDataBR(dataStr) {
        if (!dataStr) return null;
        var s = String(dataStr).trim();
        if (!s || s === "-") return null;

        // separa a data da hora (espaço ou "T")
        var apenasData = s.split(/[ T]/)[0];

        var m = apenasData.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return montarData(m[3], m[2], m[1]);

        m = apenasData.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) return montarData(m[1], m[2], m[3]);

        m = apenasData.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (m) return montarData(m[3], m[2], m[1]);

        return null;
    }

    function montarData(ano, mes, dia) {
        var d = new Date(Number(ano), Number(mes) - 1, Number(dia));
        d.setHours(0, 0, 0, 0);
        // valida (ex.: 31/02 não vira 03/03)
        if (d.getFullYear() !== Number(ano) || d.getMonth() !== Number(mes) - 1 || d.getDate() !== Number(dia)) {
            return null;
        }
        return d;
    }

    /** Timestamp (ms) da data, ou 0 se ilegível. Útil para ordenar e
        comparar com a data de hoje. */
    function dataParaTimestamp(dataStr) {
        var d = parseDataBR(dataStr);
        return d ? d.getTime() : 0;
    }

    /** Formata qualquer data reconhecida para "dd/mm/aaaa". Se não
        reconhecer, devolve o texto original. */
    function formatarDataBR(dataStr) {
        var d = parseDataBR(dataStr);
        if (!d) return dataStr ? String(dataStr) : "";
        var dd = String(d.getDate()).padStart(2, "0");
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        return dd + "/" + mm + "/" + d.getFullYear();
    }

    /* ---------------------------------------------------------------------
       2b. NÚMEROS E LEITURA DE CSV
       --------------------------------------------------------------------- */

    /** Converte um valor monetário em texto para Number.
        Aceita "50.000,00", "1.234,5", "50000.00", "R$ 50.000,00", número puro.
        Retorna NaN se não for reconhecível. */
    function parseNumeroBR(v) {
        if (v === null || v === undefined || v === "") return NaN;
        if (typeof v === "number") return v;
        var s = String(v).trim().replace(/\s/g, "").replace(/r\$/i, "");
        if (!s || s === "-") return NaN;
        // com vírgula → formato BR: ponto é milhar, vírgula é decimal
        if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
        s = s.replace(/[^0-9.\-]/g, "");
        var n = parseFloat(s);
        return isNaN(n) ? NaN : n;
    }

    /** Formata um número (ou texto numérico) como "R$ 1.234,56".
        Devolve "" se não for número. */
    function formatarBRL(v) {
        var n = typeof v === "number" ? v : parseNumeroBR(v);
        if (isNaN(n)) return "";
        return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /** Baixa um CSV com cache-buster e timeout (AbortController).
        Lança erro claro em falha de rede, HTTP != 200 ou estouro de tempo. */
    async function buscarCSV(url, opcoes) {
        opcoes = opcoes || {};
        var ms = opcoes.timeoutMs || 15000;
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, ms);
        try {
            var sep = url.indexOf("?") > -1 ? "&" : "?";
            var resp = await fetch(url + sep + "cache=" + Date.now(), { signal: ctrl.signal });
            if (!resp.ok) throw new Error("HTTP " + resp.status + " ao buscar a planilha.");
            return await resp.text();
        } catch (e) {
            if (e.name === "AbortError") {
                throw new Error("Tempo de resposta esgotado ao buscar os dados. Recarregue a página.");
            }
            throw e;
        } finally {
            clearTimeout(timer);
        }
    }

    /** Recebe a linha de cabeçalhos (array) e devolve { nome_normalizado: índice }.
        Normaliza: sem acento, minúsculo, espaços → "_". A primeira ocorrência
        de cada nome vence. Use com buscar exata: idx["data_assinatura"]. */
    function indexarColunas(headerRow) {
        var idx = {};
        (headerRow || []).forEach(function (h, i) {
            var chave = removerAcentos(String(h).trim().toLowerCase()).replace(/\s+/g, "_");
            if (chave && !(chave in idx)) idx[chave] = i;
        });
        return idx;
    }

    /* ---------------------------------------------------------------------
       3. COMUNICAÇÃO COM O IFRAME (altura automática)
       A página roda dentro de um <iframe> no site oficial. Sempre que o
       conteúdo muda de tamanho, enviamos a nova altura ao site pai; ele
       redimensiona o iframe (sem barra de rolagem interna).
       O destino do postMessage é window.ORIGEM_PAI (defina-o na página).
       --------------------------------------------------------------------- */

    /** Envia a altura atual do #wrapper ao site que hospeda o iframe. */
    function enviarAlturaIframe() {
        var wrapper = document.getElementById("wrapper");
        if (!wrapper) return;
        var destino = global.ORIGEM_PAI || "*";
        global.parent.postMessage({ tipo: "ajustarAltura", valor: wrapper.offsetHeight + 40 }, destino);
    }

    // Observa qualquer mudança de altura do conteúdo e reenvia sozinho.
    function iniciarObservadorAltura() {
        var wrapper = document.getElementById("wrapper");
        if (wrapper && "ResizeObserver" in global) {
            new ResizeObserver(function () { enviarAlturaIframe(); }).observe(wrapper);
        }
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarObservadorAltura);
    } else {
        iniciarObservadorAltura();
    }

    /* ---------------------------------------------------------------------
       4. DOWNLOAD E EXPORTAÇÕES
       Todas trabalham sobre a MESMA lista de objetos (linhas) — a página
       monta essa lista já com rótulos legíveis, CPF mascarado e links
       validados. Assim CSV, Excel, JSON e XML saem sempre coerentes.
       --------------------------------------------------------------------- */

    /** Dispara o download de um arquivo gerado em memória e libera o blob
        em seguida. */
    function downloadFile(content, fileName, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /** Transforma um rótulo ("Vigente Até", "CNPJ/CPF") num nome de tag
        XML válido ("vigente_ate", "cnpj_cpf"). */
    function slugXml(rotulo) {
        return removerAcentos(String(rotulo).toLowerCase())
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "") || "campo";
    }

    var Exportar = {
        /** CSV. O PapaParse cuida do escape de aspas, vírgulas e quebras de
            linha; o prefixo BOM (﻿) garante acentos corretos no Excel. */
        csv: function (linhas, nomeBase) {
            try {
                var csv = "﻿" + Papa.unparse(linhas);
                downloadFile(csv, nomeBase + ".csv", "text/csv;charset=utf-8");
            } catch (e) { alert("Erro ao exportar CSV: " + e.message); console.error(e); }
        },

        /** Excel (.xlsx) via SheetJS. */
        xlsx: function (linhas, nomeBase, nomeAba) {
            try {
                var ws = XLSX.utils.json_to_sheet(linhas);
                var wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, nomeAba || "Dados");
                XLSX.writeFile(wb, nomeBase + ".xlsx");
            } catch (e) { alert("Erro ao exportar Excel: " + e.message); console.error(e); }
        },

        /** JSON formatado (2 espaços de indentação). */
        json: function (linhas, nomeBase) {
            try {
                downloadFile(JSON.stringify(linhas, null, 2), nomeBase + ".json", "application/json");
            } catch (e) { alert("Erro ao exportar JSON: " + e.message); console.error(e); }
        },

        /** XML. As tags de cada registro vêm dos rótulos da lista
            (slugificados); a tag raiz e a de item podem ser passadas. */
        xml: function (linhas, nomeBase, opcoes) {
            try {
                opcoes = opcoes || {};
                var raiz = opcoes.raiz || "registros";
                var item = opcoes.item || "registro";
                var xml = '<?xml version="1.0" encoding="UTF-8"?><' + raiz + ">";
                linhas.forEach(function (obj) {
                    xml += "<" + item + ">";
                    Object.keys(obj).forEach(function (rotulo) {
                        var tag = slugXml(rotulo);
                        xml += "<" + tag + ">" + escapeXml(obj[rotulo]) + "</" + tag + ">";
                    });
                    xml += "</" + item + ">";
                });
                xml += "</" + raiz + ">";
                downloadFile(xml, nomeBase + ".xml", "application/xml");
            } catch (e) { alert("Erro ao exportar XML: " + e.message); console.error(e); }
        }
    };

    /* ---------------------------------------------------------------------
       EXPOSIÇÃO
       As funções ficam no escopo global para uso direto nas páginas.
       --------------------------------------------------------------------- */
    global.removerAcentos = removerAcentos;
    global.escapeHtml = escapeHtml;
    global.escapeXml = escapeXml;
    global.urlValida = urlValida;
    global.mascararCPF = mascararCPF;
    global.parseDataBR = parseDataBR;
    global.dataParaTimestamp = dataParaTimestamp;
    global.formatarDataBR = formatarDataBR;
    global.parseNumeroBR = parseNumeroBR;
    global.formatarBRL = formatarBRL;
    global.buscarCSV = buscarCSV;
    global.indexarColunas = indexarColunas;
    global.enviarAlturaIframe = enviarAlturaIframe;
    global.downloadFile = downloadFile;
    global.Exportar = Exportar;

})(window);
