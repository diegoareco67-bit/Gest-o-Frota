$ErrorActionPreference = "Stop"

$pastaRede = "\\s134.ms\SETORES\SUAD\COMPARTILHADO\Mapeamento Processos SUAD CGE"
$template = (Get-ChildItem $pastaRede -Filter "*Patrimonial - Diagrama Novo - SEGOV.vsdx" | Select-Object -First 1).FullName
$arquivoLocal = Join-Path (Get-Location) "Gestao_Patrimonial_SEGOV_PADRAO.vsdx"
$arquivoRede = Join-Path $pastaRede "Gestao_Patrimonial_SEGOV_PADRAO.vsdx"

$processos = [ordered]@{
    "Tombamento" = @{
        Objetivo = "Incorporar bens ao ativo imobilizado com identificacao patrimonial, vinculacao ao responsavel e termo de guarda."
        Indicadores = "Bens tombados no prazo; percentual de termos assinados; inconsistencias de cadastro."
        Inicial = "Recebimento do bem por nota fiscal, doacao ou cessao."
        Resultado = "Bem identificado, incorporado e liberado para uso."
        Executores = "Almoxarifado; Patrimonio Setorial; Area Demandante / Usuario."
        Sistemas = "Sismobi; controles internos; QR Code / plaqueta patrimonial."
        Riscos = "Cadastro incorreto; ausencia de plaqueta; falta de termo de responsabilidade."
        Oportunidades = "Rastreabilidade do bem; melhoria no controle fisico e contabil."
        Steps = @(
            "Receber bem",
            "Conferir item",
            "Definir conta contabil",
            "Gerar numero patrimonial",
            "Fixar plaqueta",
            "Vincular responsavel",
            "Emitir termo",
            "Liberar uso"
        )
    }
    "Inventario" = @{
        Objetivo = "Confrontar a existencia fisica dos bens com a base sistemica e regularizar divergencias patrimoniais."
        Indicadores = "Percentual de bens inventariados; divergencias encontradas; bens regularizados."
        Inicial = "Publicacao de portaria e instituicao da comissao de inventario."
        Resultado = "Base patrimonial atualizada e termos de responsabilidade renovados."
        Executores = "Diretoria Executiva / Dirigente; Patrimonio Setorial; Comissao de Inventario."
        Sistemas = "Sismobi; relatorios patrimoniais; leitor de codigo de barras/QR Code."
        Riscos = "Bens nao localizados; registros desatualizados; atraso na homologacao."
        Oportunidades = "Melhoria da confiabilidade cadastral e reducao de perdas."
        Steps = @(
            "Publicar portaria",
            "Emitir relatorio",
            "Vistoriar campo",
            "Avaliar conservacao",
            "Conciliar dados",
            "Regularizar achados",
            "Homologar relatorio",
            "Atualizar base"
        )
    }
    "Cessao de Uso" = @{
        Objetivo = "Formalizar cessao de bem ocioso ou viavel a orgao externo, mantendo controle patrimonial e responsabilidade."
        Indicadores = "Cessoes formalizadas; termos vigentes; bens cedidos acompanhados."
        Inicial = "Solicitacao formal de orgao cessionario externo."
        Resultado = "Bem entregue ao cessionario com termo assinado e status atualizado."
        Executores = "Diretoria Executiva / Dirigente; Patrimonio Setorial; Assessoria Juridica; Almoxarifado."
        Sistemas = "Sismobi; processo administrativo; termo de cessao."
        Riscos = "Cessao sem respaldo juridico; ausencia de controle da carga externa."
        Oportunidades = "Aproveitamento de bem ocioso e fortalecimento da cooperacao institucional."
        Steps = @(
            "Receber solicitacao",
            "Analisar ociosidade",
            "Elaborar minuta",
            "Aprovar parecer",
            "Assinar termo",
            "Alterar status",
            "Entregar ativo"
        )
    }
    "Doacao de Bens" = @{
        Objetivo = "Destinar bens inserviveis ou desnecessarios por doacao regular, com autorizacao, baixa e retirada formal."
        Indicadores = "Bens doados; processos concluidos; baixas registradas."
        Inicial = "Abertura de processo com laudo de bens inserviveis ou desnecessarios."
        Resultado = "Bem baixado e retirado pelo donatario."
        Executores = "Patrimonio Setorial; Diretoria Executiva / Dirigente; Assessoria Juridica; Almoxarifado."
        Sistemas = "Sismobi; processo administrativo; nota fiscal de baixa."
        Riscos = "Doacao sem autorizacao; donatario irregular; baixa patrimonial incompleta."
        Oportunidades = "Destinacao social de bens e liberacao de espaco fisico."
        Steps = @(
            "Abrir processo",
            "Autorizar doacao",
            "Verificar donatario",
            "Assinar termo",
            "Registrar baixa",
            "Emitir NF",
            "Retirar bens"
        )
    }
    "Desfazimento e Baixa" = @{
        Objetivo = "Realizar baixa de bens por sinistro, destruicao, obsolescencia ou descarte, com lastro tecnico e contabil."
        Indicadores = "Baixas autorizadas; descartes homologados; conciliacoes concluidas."
        Inicial = "Identificacao de sinistro, destruicao ou obsolescencia."
        Resultado = "Baixa patrimonial e contabil definitiva registrada."
        Executores = "Patrimonio Setorial; Comissao de Descarte / Tecnico; Diretoria Executiva / Dirigente; Almoxarifado; Contabilidade Geral."
        Sistemas = "Sismobi; ERP contabil; processo administrativo; CDF ou leilao."
        Riscos = "Baixa sem laudo; descarte inadequado; divergencia contabil."
        Oportunidades = "Saneamento da base patrimonial e descarte ambientalmente adequado."
        Steps = @(
            "Identificar evento",
            "Emitir laudo/BO",
            "Autorizar baixa",
            "Descaracterizar bem",
            "Destinar ou leiloar",
            "Conciliar baixa"
        )
    }
    "Bem Particular" = @{
        Objetivo = "Controlar a entrada, uso e saida de equipamento particular utilizado nas dependencias do orgao."
        Indicadores = "Bens particulares autorizados; cautelas ativas; baixas realizadas."
        Inicial = "Solicitacao de entrada e uso de equipamento pessoal a trabalho."
        Resultado = "Uso autorizado ou cautela encerrada com liberacao formal."
        Executores = "Area Demandante / Usuario; Tecnologia da Informacao; Patrimonio Setorial."
        Sistemas = "Termo de cautela; controle de portaria; registro patrimonial provisorio."
        Riscos = "Uso sem autorizacao; conflito com ativo publico; responsabilidade por danos."
        Oportunidades = "Controle claro de propriedade e reducao de inconsistencias patrimoniais."
        Steps = @(
            "Solicitar entrada",
            "Analisar seguranca",
            "Assinar cautela",
            "Identificar item",
            "Autorizar uso",
            "Solicitar saida",
            "Baixar cautela"
        )
    }
    "Transferencia" = @{
        Objetivo = "Formalizar remanejamento interno de ativos entre unidades, atualizando centro de custo e responsabilidade."
        Indicadores = "Transferencias aceitas; termos emitidos; cargas atualizadas."
        Inicial = "Solicitacao de remanejamento interno de ativos."
        Resultado = "Bem aceito no destino e termo de responsabilidade atualizado."
        Executores = "Gestor do Setor de Origem; Almoxarifado; Gestor do Setor de Destino; Patrimonio Setorial."
        Sistemas = "Sismobi; termo de responsabilidade; controle de carga patrimonial."
        Riscos = "Bem deslocado sem aceite; centro de custo incorreto; perda de rastreabilidade."
        Oportunidades = "Melhor aproveitamento dos bens e atualizacao da carga patrimonial."
        Steps = @(
            "Abrir solicitacao",
            "Liberar sistema",
            "Deslocar bem",
            "Conferir destino",
            "Aceitar carga",
            "Atualizar centro",
            "Emitir termo"
        )
    }
    "Reavaliacao e Depreciacao" = @{
        Objetivo = "Registrar depreciacao, recuperabilidade e reavaliacao dos ativos para refletir saldos patrimoniais adequados."
        Indicadores = "Fechamentos realizados; ajustes contabilizados; laudos emitidos."
        Inicial = "Fechamento mensal dos movimentos e historico de bens."
        Resultado = "Ajustes integrados ao balanco patrimonial do orgao."
        Executores = "Patrimonio Setorial; Contabilidade Geral; perito especializado quando aplicavel."
        Sistemas = "Sismobi; ERP contabil; laudo tecnico; registros de depreciacao."
        Riscos = "Valor contabil defasado; falha no teste de impairment; conciliacao incompleta."
        Oportunidades = "Maior fidedignidade contabil e apoio a decisao sobre ativos."
        Steps = @(
            "Fechar movimentos",
            "Calcular depreciacao",
            "Aplicar impairment",
            "Avaliar ajuste",
            "Emitir laudo",
            "Integrar balanco"
        )
    }
}

function Set-Text($page, $index, $text) {
    if ($page.Shapes.Count -ge $index) {
        $page.Shapes.Item($index).Text = $text
    }
}

function Add-ProcessBox($page, $x, $y, $text) {
    $shape = $page.DrawRectangle($x - 0.425, $y - 0.325, $x + 0.425, $y + 0.325)
    $shape.Text = $text
    $shape.CellsU("FillForegnd").FormulaU = "THEMEGUARD(MSOTINT(THEMEVAL(""AccentColor6""),-50))"
    $shape.CellsU("LineColor").FormulaU = "THEMEVAL()"
    $shape.CellsU("Char.Size").FormulaU = "8 pt"
    $shape.CellsU("Char.Color").FormulaU = "RGB(255,255,255)"
    $shape.CellsU("Para.HorzAlign").FormulaU = "1"
    $shape.CellsU("VerticalAlign").FormulaU = "1"
    return $shape
}

function Add-Connector($page, $fromShape, $toShape) {
    $x1 = $fromShape.CellsU("PinX").ResultIU + ($fromShape.CellsU("Width").ResultIU / 2)
    $y1 = $fromShape.CellsU("PinY").ResultIU
    $x2 = $toShape.CellsU("PinX").ResultIU - ($toShape.CellsU("Width").ResultIU / 2)
    $y2 = $toShape.CellsU("PinY").ResultIU
    $line = $page.DrawLine($x1, $y1, $x2, $y2)
    $line.CellsU("EndArrow").FormulaU = "13"
    $line.CellsU("LineColor").FormulaU = "THEMEVAL()"
    $line.CellsU("LineWeight").FormulaU = "0.75 pt"
    return $line
}

if (Test-Path $arquivoLocal) {
    Remove-Item $arquivoLocal -Force
}
Copy-Item $template $arquivoLocal -Force

$visio = New-Object -ComObject Visio.Application
$visio.Visible = $false
$doc = $null

try {
    $doc = $visio.Documents.Open($arquivoLocal)

    while ($doc.Pages.Count -gt $processos.Count) {
        $doc.Pages.Item($doc.Pages.Count).Delete(0)
    }

    $pageIndex = 1
    foreach ($nome in $processos.Keys) {
        $data = $processos[$nome]
        $page = $doc.Pages.Item($pageIndex)
        $page.Name = $nome

        for ($i = $page.Shapes.Count; $i -ge 42; $i--) {
            $page.Shapes.Item($i).Delete()
        }

        Set-Text $page 8 $data.Objetivo
        Set-Text $page 9 $data.Indicadores
        Set-Text $page 10 "SEGOV e suas secretarias-executivas; unidades demandantes; orgaos de controle; sociedade."
        Set-Text $page 11 "Decreto Estadual n. 16.268/2023; Decreto Estadual n. 16.291/2023; Decreto Estadual n. 16.295/2023; normas correlatas."
        Set-Text $page 14 $data.Inicial
        Set-Text $page 15 $data.Resultado
        Set-Text $page 24 $data.Executores
        Set-Text $page 25 $data.Sistemas
        Set-Text $page 26 $data.Riscos
        Set-Text $page 27 $data.Oportunidades
        Set-Text $page 35 $nome
        Set-Text $page 40 "SUAD/SEGOV"
        Set-Text $page 41 "Gestao Patrimonial"

        $steps = $data.Steps
        $count = $steps.Count
        $startX = 2.45
        $endX = 10.15
        $spacing = if ($count -gt 1) { ($endX - $startX) / ($count - 1) } else { 0 }
        $y = 3.28
        $boxes = @()

        for ($s = 0; $s -lt $count; $s++) {
            $x = $startX + ($s * $spacing)
            $boxes += Add-ProcessBox $page $x $y $steps[$s]
        }

        for ($s = 0; $s -lt ($boxes.Count - 1); $s++) {
            Add-Connector $page $boxes[$s] $boxes[$s + 1] | Out-Null
        }

        if ($page.Shapes.Count -ge 36) {
            Add-Connector $page $page.Shapes.Item(36) $boxes[0] | Out-Null
        }
        if ($page.Shapes.Count -ge 37) {
            Add-Connector $page $boxes[$boxes.Count - 1] $page.Shapes.Item(37) | Out-Null
        }

        $input1 = $page.DrawRectangle(2.15, 3.89, 3.25, 4.43)
        $input1.Text = $data.Inicial
        $input1.CellsU("Char.Size").FormulaU = "7 pt"
        $input1.CellsU("LinePattern").FormulaU = "0"

        $output1 = $page.DrawRectangle(9.15, 2.13, 10.95, 2.67)
        $output1.Text = $data.Resultado
        $output1.CellsU("Char.Size").FormulaU = "7 pt"
        $output1.CellsU("LinePattern").FormulaU = "0"

        $pageIndex++
    }

    $doc.Save()
    $doc.Close()
    $doc = $null
    Copy-Item $arquivoLocal $arquivoRede -Force
}
finally {
    if ($doc -ne $null) {
        $doc.Close()
    }
    $visio.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($visio) | Out-Null
}

Write-Host "Arquivo VSDX no padrao oficial gerado: $arquivoLocal"
Write-Host "Copia enviada para: $arquivoRede"
