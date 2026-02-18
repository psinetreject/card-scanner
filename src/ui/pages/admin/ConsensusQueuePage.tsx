import { useEffect, useState } from 'react';
import type { AuthSession, Claim, Observation } from '../../../core/types';
import { useServices } from '../../hooks/useServices';

type Props = { session: AuthSession };

export function ConsensusQueuePage({ session }: Props) {
  const services = useServices();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selected, setSelected] = useState<Claim>();
  const [evidence, setEvidence] = useState<Observation[]>([]);

  const load = async () => setClaims(await services.moderation.getConsensusQueue(session));
  useEffect(() => { load(); }, []);

  const open = async (claim: Claim) => {
    setSelected(claim);
    setEvidence(await services.moderation.getObservationsForClaim(session, claim.claimId));
  };

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Consensus Queue</h3>
        <div className="list">
          {claims.map((c) => (
            <button key={c.claimId} className="secondary" onClick={() => open(c)}>
              {c.fieldPath}: {String(c.proposedValue)} · score {(c.consensusScore * 100).toFixed(1)}% · contributors {c.consensusCount} · disagreement {c.disagreementCount}
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <h3>Claim Detail</h3>
        {!selected && <p>Select claim.</p>}
        {selected && (
          <>
            <p>{selected.targetType}:{selected.targetId} {selected.fieldPath}</p>
            <h4>Value distribution</h4>
            <pre>{JSON.stringify(selected.competingValues, null, 2)}</pre>
            <h4>Evidence / contributors</h4>
            <pre>{JSON.stringify(evidence.map((e) => ({ id: e.observationId, principal: e.principalId, ocr: e.ocrConfidence, quality: e.captureQualityScore, scanRef: e.scanRef })), null, 2)}</pre>
            <button onClick={async () => { await services.moderation.setClaimStatus(session, selected.claimId, 'accepted'); await load(); }}>Approve</button>{' '}
            <button className="secondary" onClick={async () => { await services.moderation.setClaimStatus(session, selected.claimId, 'rejected'); await load(); }}>Reject</button>{' '}
            <button className="secondary" onClick={async () => { await services.moderation.setClaimStatus(session, selected.claimId, 'superseded'); await load(); }}>Supersede</button>
          </>
        )}
      </div>
    </div>
  );
}
