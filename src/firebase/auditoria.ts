import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

export type AcaoAuditoria =
  | "aprovar_solicitacao"
  | "recusar_solicitacao"
  | "checkout"
  | "checkin"
  | "aprovar_condutor"
  | "recusar_condutor"
  | "cadastrar_veiculo"
  | "editar_veiculo"
  | "registrar_manutencao"
  | "concluir_manutencao"
  | "reservar_sala"
  | "cancelar_reserva_sala"
  | "reservar_equipamento"
  | "retirar_equipamento"
  | "devolver_equipamento"
  | "cancelar_emprestimo_equipamento"
  | "aprovar_veiculo_proprio"
  | "recusar_veiculo_proprio"
  | "enviar_indenizacao"
  | "anonimizar_usuario";

/**
 * Grava um registro imutável na coleção `auditoria`.
 * A função nunca lança exceção — falha silenciosa para não bloquear operações principais.
 * Regras Firestore devem permitir apenas create (sem update/delete) nessa coleção.
 */
export async function registrarAuditoria(
  acao: AcaoAuditoria,
  usuarioId: string,
  usuarioNome: string,
  detalhes: Record<string, unknown>
): Promise<void> {
  try {
    await addDoc(collection(db, "auditoria"), {
      acao,
      usuarioId,
      usuarioNome,
      detalhes,
      criadoEm: serverTimestamp(),
    });
  } catch (e) {
    // Não bloquear a operação principal por falha de log
    console.error("[auditoria] falha ao registrar:", e);
  }
}
