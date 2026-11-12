// Only shown in the frontend-preview build (npm run build:cfp), where data saves locally.
export function PreviewBanner() {
  if (import.meta.env.VITE_LOCAL_DATA !== '1') return null;
  return <p className="preview-banner">Frontend preview — picks and settings save to this browser only.</p>;
}
