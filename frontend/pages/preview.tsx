
// pages/preview.tsx
'use client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PreviewPage() {
  const router = useRouter();
  const { name } = router.query;
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (name) {
      const url = `/uploads/${name}`;
      setFileUrl(url);
    }
  }, [name]);

  if (!fileUrl) return <p>Loading preview...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Document Preview</h1>
      <iframe
        src={`https://docs.google.com/gview?url=${process.env.NEXT_PUBLIC_BASE_URL}${fileUrl}&embedded=true`}
        style={{ width: '100%', height: '600px' }}
        frameBorder="0"
      />
    </div>
  );
}
