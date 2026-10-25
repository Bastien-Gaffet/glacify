import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

/** Screen title, with an optional back arrow and actions on the right. */
export function PageHeader({
  title,
  eyebrow,
  back,
  actions,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  back?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="mb-6">
      {(back || actions) && (
        <div className="mb-3 flex items-center justify-between">
          {back ? (
            <button onClick={() => navigate(back)} className="icon-btn -ml-2.5 text-ink" aria-label="Retour">
              <ArrowLeft size={22} />
            </button>
          ) : (
            <span />
          )}
          <div className="-mr-2 flex items-center gap-1">{actions}</div>
        </div>
      )}
      {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      <h1 className="title">{title}</h1>
      {children}
    </header>
  );
}
