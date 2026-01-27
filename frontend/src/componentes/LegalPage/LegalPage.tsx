import type { ReactNode } from "react";
import styles from "./LegalPage.module.css";

export type LegalSection = {
  title: string;
  content: ReactNode;
};

interface Props {
  title: string;
  description?: string;
  updated: string;
  sections: LegalSection[];
}

export default function LegalPage({ title, description, updated, sections }: Props) {
  return (
    <main className="fondoSeccion fondoA espaciadoSeccion">
      <div className="contenedor">
        <article className={styles.wrapper}>
          <header className={styles.header}>
            <p className={styles.updated}>Última actualización: {updated}</p>
            <h1 className={styles.title}>{title}</h1>
            {description ? <p className={styles.description}>{description}</p> : null}
          </header>

          {sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <div className={styles.sectionContent}>{section.content}</div>
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
