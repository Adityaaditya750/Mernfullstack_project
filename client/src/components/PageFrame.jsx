export const PageFrame = ({ eyebrow, title, description, children }) => (
  <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 2xl:py-14">
    <header className="mb-7 sm:mb-9">
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          {eyebrow}
        </p>
      )}
      <h1 className="break-words text-2xl font-extrabold tracking-tight text-[#063b49] sm:text-3xl lg:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          {description}
        </p>
      )}
    </header>
    {children}
  </div>
);

export const Notice = ({ children, tone = 'error' }) => {
  const styles = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`} role="alert">
      {children}
    </div>
  );
};

export const LoadingState = ({ label = 'Loading...' }) => (
  <div className="flex min-h-48 items-center justify-center px-4 text-sm text-slate-600" role="status">
    {label}
  </div>
);
