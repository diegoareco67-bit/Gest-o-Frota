export type Perfil = "gestor" | "usuario" | "consulta";
export type StatusVeiculo = "disponivel" | "em_uso" | "manutencao" | "indisponivel";

export interface Usuario {
  uid: string;
  nome: string;
  email: string;
  perfil: Perfil;
  setor: string;
  matricula?: string;
  numeroCnh?: string;
  vencimentoCnh?: string;   // ISO date string "YYYY-MM-DD"
  ativo: boolean;
}
