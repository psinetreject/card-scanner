import { useEffect, useMemo, useState } from 'react';
import type { AuthSession, ModerationProposal } from '../../../core/types';
import { useServices } from '../../hooks/useServices';

type Props = { session: AuthSession };

export function PendingProposalsPage({ session }: Props) {
  const services = useServices();
  const [proposals, setProposals] = useState<ModerationProposal[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState('0');
  const [selected, setSelected] = useState<ModerationProposal>();

  const load = async () => {
    const p = await services.moderation.getPendingProposals(session, {
      type: typeFilter || undefined,
      minConfidence: Number(minConfidence) || undefined,
    });
    setProposals(p);
  };

  useEffect(() => { load(); }, [typeFilter, minConfidence]);

  const filtered = useMemo(() => proposals, [proposals]);

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Pending Proposals Queue</h3>
        <label>Type</label>
        <input value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} placeholder="edit_card, correction, alias..." />
        <label>Min confidence</label>
        <input value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)} />
        <div className="list" style={{ marginTop: '.5rem' }}>
          {filtered.map((p) => (
            <button key={p.proposalId} className="secondary" onClick={() => setSelected(p)}>
              {p.type} · {p.userId} · conf {(p.payload.confidence ?? 0).toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Proposal Detail / Diff Preview</h3>
        {!selected && <p>Select a proposal.</p>}
        {selected && (
          <>
            <p>ID: {selected.proposalId}</p>
            <p>Status: {selected.status} {selected.flagged ? '(flagged)' : ''}</p>
            <p>Entity: {selected.payload.diff.entity} / {selected.payload.diff.entityId}</p>
            <div className="grid cols-2">
              <div>
                <h4>Old</h4>
                <pre>{JSON.stringify(selected.payload.diff.oldValues, null, 2)}</pre>
              </div>
              <div>
                <h4>New</h4>
                <pre>{JSON.stringify(selected.payload.diff.newValues, null, 2)}</pre>
              </div>
            </div>
            <button onClick={async () => { await services.moderation.approveProposal(session, selected.proposalId); await load(); }}>Approve</button>{' '}
            <button className="secondary" onClick={async () => { await services.moderation.rejectProposal(session, selected.proposalId); await load(); }}>Reject</button>
          </>
        )}
      </div>
    </div>
  );
}
