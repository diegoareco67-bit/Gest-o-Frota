$ErrorActionPreference = "Stop"

$arquivo = Join-Path (Get-Location) "Estrutura_Completa_8_Processos_Visio.xlsx"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $wb = $excel.Workbooks.Add()
    while ($wb.Worksheets.Count -gt 1) {
        $wb.Worksheets.Item($wb.Worksheets.Count).Delete()
    }

    $headers = @(
        "ID do Passo",
        "Descricao do Passo",
        "Proximo Passo",
        "Texto do Conector",
        "Tipo de Forma (Shape)",
        "Dono / Raia (Swimlane)"
    )

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
            @("C5", "Alteracao do Status do Bem para 'Cedido' e Vinculacao da Carga Externa", "C6", "", "Process", "Patrimonio Setorial"),
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

    $primeiraAba = $true

    foreach ($nome in $processos.Keys) {
        if ($primeiraAba) {
            $ws = $wb.Worksheets.Item(1)
            $primeiraAba = $false
        }
        else {
            $ws = $wb.Worksheets.Add(
                [System.Reflection.Missing]::Value,
                $wb.Worksheets.Item($wb.Worksheets.Count)
            )
        }

        $ws.Name = $nome
        $ws.Cells.Item(1, 1).Value2 = "Mapeamento Oficial: $($nome.Substring(4))"
        $ws.Range("A1:F1").Merge() | Out-Null
        $ws.Cells.Item(1, 1).Font.Name = "Calibri"
        $ws.Cells.Item(1, 1).Font.Size = 16
        $ws.Cells.Item(1, 1).Font.Bold = $true
        $ws.Cells.Item(1, 1).Font.Color = 7878177

        for ($col = 0; $col -lt $headers.Count; $col++) {
            $cell = $ws.Cells.Item(4, $col + 1)
            $cell.Value2 = $headers[$col]
            $cell.Font.Name = "Calibri"
            $cell.Font.Size = 11
            $cell.Font.Bold = $true
            $cell.Font.Color = 16777215
            $cell.Interior.Color = 7878177
            $cell.HorizontalAlignment = -4108
            $cell.VerticalAlignment = -4108
            $cell.Borders.LineStyle = 1
        }

        $row = 5
        foreach ($linha in $processos[$nome]) {
            for ($col = 0; $col -lt $linha.Count; $col++) {
                $cell = $ws.Cells.Item($row, $col + 1)
                $cell.Value2 = $linha[$col]
                $cell.Font.Name = "Calibri"
                $cell.Font.Size = 11
                $cell.Borders.LineStyle = 1
                $cell.Interior.Color = if ($row % 2 -eq 0) { 16447218 } else { 16777215 }
                $cell.HorizontalAlignment = if (@(1, 3, 5) -contains ($col + 1)) { -4108 } else { -4131 }
                $cell.VerticalAlignment = -4160
                $cell.WrapText = $true
            }
            $row++
        }

        $ws.Columns.AutoFit() | Out-Null
        $ws.Rows.AutoFit() | Out-Null
    }

    if (Test-Path $arquivo) {
        Remove-Item $arquivo -Force
    }

    $wb.SaveAs($arquivo, 51)
    $wb.Close($true)
}
finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}

Write-Host "Arquivo gerado com sucesso: $arquivo"
