'use client';

import { useState } from 'react';
import { Editor } from '@/components/editor/Editor';
import { ClaimGraphPane } from '@/components/editor/ClaimGraphPane';

export function DocumentSurface({ documentId }: { documentId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid grid-cols-[1fr_360px]">
      <Editor
        documentId={documentId}
        onClaimsDetected={() => setRefreshKey((k) => k + 1)}
      />
      <ClaimGraphPane documentId={documentId} refreshKey={refreshKey} />
    </div>
  );
}
