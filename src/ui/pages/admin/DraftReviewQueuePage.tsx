import { useEffect, useMemo, useState } from 'react';
import type { AuthSession, Draft } from '../../../core/types';
import { useServices } from '../../hooks/useServices';

type Props = { session: AuthSession };

export function DraftReviewQueuePage({ session }: Props) {
  const services = useServices();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Draft>();
  const [statusFilter, setStatusFilter] = useState('');
  const [editedPayload, setEditedPayload] = useState('{}');
  const [note, setNote] = useState('');

  const load = async () => setDrafts(await services.moderation.getDraftQueue(session));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => drafts.filter((d) => !statusFilter || d.status === statusFilter), [drafts, statusFilter]);

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Draft Review Queue</h3>
        <label>Status filter</label>
        <input value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="new/reviewing" />
        <div className="list" style={{ marginTop: '.5rem' }}>
          {filtered.map((d) => <button className="secondary" key={d.draftId} onClick={() => { setSelected(d); setEditedPayload(JSON.stringify(d.proposedPayload, null, 2)); }}>{d.status} · {d.targetType} · {d.createdBy}</button>)}
        </div>
      </div>
      <div className="panel">
        <h3>Draft Detail</h3>
        {!selected && <p>Select a draft.</p>}
        {selected && (
          <>
            <p>Draft: {selected.draftId}</p>
            <p>Source scan: {selected.sourceScanRef ?? 'n/a'}</p>
            <div className="grid cols-2">
              <div><h4>Extracted fields</h4><pre>{JSON.stringify(selected.extractedFields, null, 2)}</pre></div>
              <div><h4>Current proposed payload</h4><textarea rows={12} value={editedPayload} onChange={(e) => setEditedPayload(e.target.value)} /></div>
            </div>
            <label>Review notes</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <button className="secondary" onClick={async () => { await services.moderation.markDraftReviewing(session, selected.draftId); await load(); }}>Mark reviewing</button>
              <button className="secondary" onClick={async () => { await services.moderation.requestDraftChanges(session, selected.draftId, note); await load(); }}>Request changes</button>
              <button className="secondary" onClick={async () => { await services.moderation.rejectDraft(session, selected.draftId, note); await load(); }}>Reject</button>
              <button onClick={async () => { let payload = {}; try { payload = JSON.parse(editedPayload); } catch {} await services.moderation.publishDraft(session, selected.draftId, payload); await load(); }}>Publish</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
