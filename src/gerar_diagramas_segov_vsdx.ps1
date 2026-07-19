$ErrorActionPreference = "Stop"

$arquivoLocal = Join-Path (Get-Location) "Gestao_Patrimonial_SEGOV.vsdx"
$arquivoRede = "\\s134.ms\SETORES\SUAD\COMPARTILHADO\Mapeamento Processos SUAD CGE\Gestao_Patrimonial_SEGOV.vsdx"

$processos = [ordered]@{
    "01. Tombamento" = @(
        @("T1", "Recebimento do Bem (Nota Fiscal, Doacao ou Cessao)", "T2", "Inicio", "Start", "Almoxarifado"),
        @("T2", "Conferencia Fisica do Item vs. Documento Fiscal", "T3", "Ok", "Decision", "Almoxarifado"),
        @("T3", "Definicao da Conta Contabil, Vida Util e Valor Residual", "T4", "Conforme", "Process", "Patrimonio Setorial"),
        @("T4", "Geracao do Numero Patrimonial e Impressao de Plaqueta/QR Code", "T5", "", "Process", "Patrimonio Setorial"),
        @("T5", "Fixacao Fisica da Plaqueta de Identificacao no Bem", "T6", "", "Process", "Almoxarifado"),
        @("T6", "Vinculacao do Centro de Custo, Localizacao e Responsavel no Sistema", "T7", "", "Process", "Patrimonio Setorial"),
        @("T7", "Emissao, Assinatura e Arquivamento do Termo de Guarda e Responsabilidade", "T8", "", "Process", "Area Demandante / Usuario"),
        @("T8", "Incorporacao ao Ativo Imobilizado e Liberacao para Uso", "", "Fim", "End", "Patrimonio Setorial")
    )
    "02. Inventario" = @(
        @("I1", "Publicacao de Portaria e Instituicao da Comissao de Inventario", "I2", "Inicio", "Start", "Diretoria Executiva / Dirigente"),
        @("I2", "Emissao de Relatorio Teorico e Cronograma de Varredura", "I3", "", "Process", "Patrimonio Setorial"),
        @("I3", "Vistoria em Campo e Leitura Fisica dos Codigos de Barra/QR Code", "I4", "", "Process", "Comissao de Inventario"),
        @("I4", "Avaliacao do Estado de Conservacao (Bom, Ocioso, Inservivel, etc.)", "I5", "", "Process", "Comissao de Inventario"),
        @("I5", "Confronto e Conciliacao: Dados de Campo vs. Base Sistemica", "I6", "", "Decision", "Patrimonio Setorial"),
        @("I6", "Instauracao de Sindicancia ou Regularizacao de Bens Achados", "I7", "Divergente", "Process", "Diretoria Executiva / Dirigente"),
        @("I7", "Elaboracao, Homologacao e Assinatura do Relatorio Final do Inventario", "I8", "Ok", "Process", "Comissao de Inventario"),
        @("I8", "Atualizacao Cadastral e Renovacao Geral dos Termos de Responsabilidade", "", "Fim", "End", "Patrimonio Setorial")
    )
    "03. Cessao de Uso" = @(
        @("C1", "Recebimento de Solicitacao Formal de Orgao Cessionario Externo", "C2", "Inicio", "Start", "Diretoria Executiva / Dirigente"),
        @("C2", "Analise Tecnica de Ociosidade e Viabilidade Operacional do Bem", "C3", "", "Process", "Patrimonio Setorial"),
        @("C3", "Analise Juridica e Confeccao da Minuta do Termo de Cessao de Uso", "C4", "", "Process", "Assessoria Juridica"),
        @("C4", "Aprovacao do Parecer Juridico e Assinatura do Termo pelas Autoridades", "C5", "Aprovado", "Decision", "Diretoria Executiva / Dirigente"),
        @("C5", "Alteracao do Status do Bem para Cedido e Vinculacao da Carga Externa", "C6", "", "Process", "Patrimonio Setorial"),
        @("C6", "Entrega Fisica do Ativo Mediante Assinatura do Termo de Recebimento", "", "Fim", "End", "Almoxarifado")
    )
    "04. Doacao de Bens" = @(
        @("D1", "Abertura de Processo com Laudo de Bens Inserviveis ou Desnecessarios", "D2", "Inicio", "Start", "Patrimonio Setorial"),
        @("D2", "Autorizacao da Alta Administracao para Doacao com Fim Social", "D3", "Autorizado", "Decision", "Diretoria Executiva / Dirigente"),
        @("D3", "Chamamento Publico ou Analise de Regularidade Juridica do Donatario", "D4", "Ok", "Process", "Assessoria Juridica"),
        @("D4", "Assinatura do Termo de Doacao Definitiva pelas Partes", "D5", "", "Process", "Diretoria Executiva / Dirigente"),
        @("D5", "Processamento da Baixa Patrimonial por Doacao no Sistema", "D6", "", "Process", "Patrimonio Setorial"),
        @("D6", "Emissao da Nota Fiscal de Baixa e Retirada dos Bens pelo Donatario", "", "Fim", "End", "Almoxarifado")
    )
    "05. Desfazimento e Baixa" = @(
        @("B1", "Identificacao de Sinistro (Roubo/Furto), Destruicao ou Obsolescencia", "B2", "Inicio", "Start", "Patrimonio Setorial"),
        @("B2", "Emissao de Laudo de Inservibilidade ou Anexacao de Boletim de Ocorrencia", "B3", "", "Process", "Comissao de Descarte / Tecnico"),
        @("B3", "Julgamento, Homologacao e Autorizacao da Baixa pela Diretoria", "B4", "Aprovado", "Decision", "Diretoria Executiva / Dirigente"),
        @("B4", "Descaracterizacao Fisica Completa do Bem (Remocao de Logos e Marcas)", "B5", "", "Process", "Almoxarifado"),
        @("B5", "Descarte Ecologico Homologado (Geracao de CDF) ou Inclusao em Leilao", "B6", "", "Process", "Almoxarifado"),
        @("B6", "Conciliacao e Lancamento da Baixa Contabil Definitiva no ERP", "", "Fim", "End", "Contabilidade Geral")
    )
    "06. Bem Particular" = @(
        @("P1", "Solicitacao de Entrada e Uso de Equipamento Pessoal a Trabalho", "P2", "Inicio", "Start", "Area Demandante / Usuario"),
        @("P2", "Analise de Seguranca da Informacao, Redes e Requisitos Tecnicos", "P3", "Aprovado", "Decision", "Tecnologia da Informacao (TI)"),
        @("P3", "Assinatura do Termo de Cautela, Autorizacao de Uso e Isencao de Danos", "P4", "", "Process", "Area Demandante / Usuario"),
        @("P4", "Fixacao de Etiqueta de Identificacao Provisoria de Item Particular", "P5", "", "Process", "Patrimonio Setorial"),
        @("P5", "Uso Autorizado do Bem nas Dependencias do Orgao Publico", "P6", "", "Process", "Area Demandante / Usuario"),
        @("P6", "Solicitacao de Desvinculacao ou Desligamento do Colaborador", "P7", "", "Process", "Area Demandante / Usuario"),
        @("P7", "Baixa na Cautela, Remocao da Identificacao e Liberacao na Portaria", "", "Fim", "End", "Patrimonio Setorial")
    )
    "07. Transferencia" = @(
        @("F1", "Abertura de Solicitacao de Remanejamento Interno de Ativos", "F2", "Inicio", "Start", "Gestor do Setor de Origem"),
        @("F2", "Liberacao Sistemica e Deslocamento Fisico do Bem para Nova Unidade", "F3", "", "Process", "Almoxarifado"),
        @("F3", "Conferencia Fisica do Estado e Caracteristicas do Bem no Destino", "F4", "", "Process", "Gestor do Setor de Destino"),
        @("F4", "Aceite Eletronico da Carga Patrimonial no Sistema", "F5", "Confirmado", "Decision", "Gestor do Setor de Destino"),
        @("F5", "Atualizacao Automatica do Centro de Custo no Banco de Dados", "F6", "", "Process", "Patrimonio Setorial"),
        @("F6", "Geracao e Assinatura Digital do Novo Termo de Responsabilidade", "", "Fim", "End", "Patrimonio Setorial")
    )
    "08. Reavaliacao e Depreciacao" = @(
        @("R1", "Fechamento Mensal dos Movimentos e Historico de Bens", "R2", "Inicio", "Start", "Patrimonio Setorial"),
        @("R2", "Calculo Automatizado das Quotas de Depreciacao Linear Acumulada", "R3", "", "Process", "Patrimonio Setorial"),
        @("R3", "Aplicacao Periodica do Teste de Recuperabilidade de Ativos (Impairment)", "R4", "", "Process", "Patrimonio Setorial"),
        @("R4", "Necessidade de Ajuste ao Valor Justo de Mercado Encontrada?", "R5", "Sim", "Decision", "Patrimonio Setorial"),
        @("R5", "Contratacao e Emissao de Laudo Tecnico por Perito Especializado", "R6", "", "Process", "Contabilidade Geral"),
        @("R6", "Integracao Contabil dos Ajustes e Saldos no Balanco Patrimonial do Orgao", "", "Fim", "End", "Contabilidade Geral")
    )
}

function Set-ShapeStyle($shape, $type) {
    $shape.CellsU("LineColor").FormulaU = "RGB(31,78,120)"
    $shape.CellsU("LineWeight").FormulaU = "1.25 pt"
    $shape.CellsU("Char.Size").FormulaU = "8 pt"
    $shape.CellsU("Para.HorzAlign").FormulaU = "1"

    if ($type -eq "Start") {
        $shape.CellsU("FillForegnd").FormulaU = "RGB(209,250,229)"
    }
    elseif ($type -eq "End") {
        $shape.CellsU("FillForegnd").FormulaU = "RGB(219,234,254)"
    }
    elseif ($type -eq "Decision") {
        $shape.CellsU("FillForegnd").FormulaU = "RGB(254,249,195)"
    }
    else {
        $shape.CellsU("FillForegnd").FormulaU = "RGB(242,246,250)"
    }
}

function New-StepShape($page, $x, $y, $text, $type) {
    $width = 2.25
    $height = 0.72

    if ($type -eq "Decision") {
        $shape = $page.DrawRectangle($x - 0.85, $y - 0.55, $x + 0.85, $y + 0.55)
        $shape.CellsU("Angle").FormulaU = "45 deg"
        $shape.Text = $text
    }
    elseif ($type -eq "Start" -or $type -eq "End") {
        $shape = $page.DrawOval($x - ($width / 2), $y - ($height / 2), $x + ($width / 2), $y + ($height / 2))
        $shape.Text = $text
    }
    else {
        $shape = $page.DrawRectangle($x - ($width / 2), $y - ($height / 2), $x + ($width / 2), $y + ($height / 2))
        $shape.Text = $text
    }

    Set-ShapeStyle $shape $type
    return $shape
}

function New-Connector($page, $fromShape, $toShape, $label) {
    $x1 = $fromShape.CellsU("PinX").ResultIU
    $y1 = $fromShape.CellsU("PinY").ResultIU - 0.42
    $x2 = $toShape.CellsU("PinX").ResultIU
    $y2 = $toShape.CellsU("PinY").ResultIU + 0.42
    $line = $page.DrawLine($x1, $y1, $x2, $y2)
    $line.CellsU("EndArrow").FormulaU = "13"
    $line.CellsU("LineColor").FormulaU = "RGB(100,116,139)"
    $line.CellsU("LineWeight").FormulaU = "1 pt"

    if ($label) {
        $line.Text = $label
        $line.CellsU("Char.Size").FormulaU = "7 pt"
    }
}

$visio = New-Object -ComObject Visio.Application
$visio.Visible = $false
$doc = $null

try {
    $doc = $visio.Documents.Add("")
    $firstPage = $true

    foreach ($nome in $processos.Keys) {
        if ($firstPage) {
            $page = $doc.Pages.Item(1)
            $firstPage = $false
        }
        else {
            $page = $doc.Pages.Add()
        }

        $rows = $processos[$nome]
        $owners = @()
        foreach ($row in $rows) {
            if ($owners -notcontains $row[5]) {
                $owners += $row[5]
            }
        }

        $laneWidth = 2.8
        $pageWidth = [Math]::Max(11, $owners.Count * $laneWidth + 1)
        $pageHeight = [Math]::Max(8.5, $rows.Count * 1.18 + 1.7)
        $page.PageSheet.CellsU("PageWidth").FormulaU = "$pageWidth in"
        $page.PageSheet.CellsU("PageHeight").FormulaU = "$pageHeight in"
        $page.Name = $nome

        $title = $page.DrawRectangle(0.25, $pageHeight - 0.55, $pageWidth - 0.25, $pageHeight - 0.15)
        $title.Text = "Mapeamento Oficial: $($nome.Substring(4))"
        $title.CellsU("FillForegnd").FormulaU = "RGB(31,78,120)"
        $title.CellsU("LinePattern").FormulaU = "0"
        $title.CellsU("Char.Color").FormulaU = "RGB(255,255,255)"
        $title.CellsU("Char.Size").FormulaU = "14 pt"
        $title.CellsU("Char.Style").FormulaU = "1"

        $ownerX = @{}
        for ($i = 0; $i -lt $owners.Count; $i++) {
            $left = 0.5 + ($i * $laneWidth)
            $right = $left + $laneWidth - 0.12
            $center = ($left + $right) / 2
            $ownerX[$owners[$i]] = $center

            $lane = $page.DrawRectangle($left, 0.35, $right, $pageHeight - 0.72)
            $lane.SendToBack()
            $lane.CellsU("FillForegnd").FormulaU = if ($i % 2 -eq 0) { "RGB(248,250,252)" } else { "RGB(241,245,249)" }
            $lane.CellsU("LineColor").FormulaU = "RGB(203,213,225)"

            $laneHeader = $page.DrawRectangle($left, $pageHeight - 1.08, $right, $pageHeight - 0.72)
            $laneHeader.Text = $owners[$i]
            $laneHeader.CellsU("FillForegnd").FormulaU = "RGB(226,232,240)"
            $laneHeader.CellsU("LineColor").FormulaU = "RGB(203,213,225)"
            $laneHeader.CellsU("Char.Size").FormulaU = "8 pt"
            $laneHeader.CellsU("Char.Style").FormulaU = "1"
        }

        $shapesById = @{}
        for ($i = 0; $i -lt $rows.Count; $i++) {
            $row = $rows[$i]
            $id = $row[0]
            $desc = $row[1]
            $type = $row[4]
            $owner = $row[5]
            $x = $ownerX[$owner]
            $y = $pageHeight - 1.65 - ($i * 1.05)
            $text = "$id - $desc"
            $shape = New-StepShape $page $x $y $text $type
            $shapesById[$id] = $shape
        }

        foreach ($row in $rows) {
            $id = $row[0]
            $nextId = $row[2]
            $label = $row[3]
            if ($nextId -and $shapesById.ContainsKey($nextId)) {
                New-Connector $page $shapesById[$id] $shapesById[$nextId] $label
            }
        }
    }

    if (Test-Path $arquivoLocal) {
        Remove-Item $arquivoLocal -Force
    }
    $doc.SaveAs($arquivoLocal)
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

Write-Host "Arquivo VSDX gerado com sucesso: $arquivoLocal"
Write-Host "Copia enviada para: $arquivoRede"
