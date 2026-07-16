export function BootScreen() {
  return (
    <section className="boot-screen" aria-live="polite">
      <div className="boot-mark" aria-hidden="true">
        M
      </div>
      <p>
        НАСТРОЙКА СИГНАЛА<span className="loading-dots">...</span>
      </p>
    </section>
  );
}

