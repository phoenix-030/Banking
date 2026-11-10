export function PassageBlock({
  title,
  text,
  language,
  imageUrl,
}: {
  title?: string | null;
  text?: string | null;
  language?: string | null;
  imageUrl?: string | null;
}) {
  if (!text) return null;
  return (
    <article className="question-passage">
      {title && <strong>{title}</strong>}
      {language && <small>{language}</small>}
      {imageUrl && (
        <img src={imageUrl} alt="Passage illustration" loading="lazy" />
      )}
      <p>{text}</p>
    </article>
  );
}
