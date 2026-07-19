import { Component, ReactNode } from "react";

interface Props  { children: ReactNode; }
interface State  { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#F1F5F9", fontFamily:"'Sora',system-ui,sans-serif", padding:"1rem" }}>
        <div style={{ background:"#fff", borderRadius:16, border:"1px solid #fecaca",
          padding:"2rem 2.5rem", maxWidth:440, width:"100%", textAlign:"center",
          boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>

          <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#0F172A", marginBottom:8 }}>
            Algo deu errado
          </div>
          <p style={{ fontSize:14, color:"#64748B", lineHeight:1.6, marginBottom:24 }}>
            Ocorreu um erro inesperado na aplicação.<br/>
            Tente recarregar a página. Se o problema persistir,<br/>contate o suporte técnico.
          </p>

          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding:"10px 20px", background:"#F1F5F9", color:"#5A7A9A",
                border:"1px solid #E1EAF5", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              Tentar novamente
            </button>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/login"; }}
              style={{ padding:"10px 20px", background:"#1E3A8A", color:"#fff",
                border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              ← Ir para o login
            </button>
          </div>

          {this.state.error && (
            <details style={{ marginTop:20, fontSize:11, color:"#94A3B8", textAlign:"left" }}>
              <summary style={{ cursor:"pointer", fontWeight:600, marginBottom:6 }}>Detalhes técnicos</summary>
              <pre style={{ whiteSpace:"pre-wrap", wordBreak:"break-all", background:"#F8FAFC",
                padding:"10px 12px", borderRadius:8, maxHeight:140, overflow:"auto",
                border:"1px solid #F1F5F9", fontSize:10, lineHeight:1.6 }}>
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack?.split("\n").slice(0, 6).join("\n")}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
