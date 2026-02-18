import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useServices } from '../hooks/useServices';

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const services = useServices();
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  const state = location.state as
    | {
        ocr: { text: string; name?: string; setCode?: string; confidence?: number };
        visual: { hashFull: string; hashArt: string };
        match: {
          top?: { card: { id: string; name: string; type?: string }; print?: { printId: string; setCode: string }; score: number; reason: string; details?: string };
          alternatives: { card: { id: string; name: string }; score: number; reason: string }[];
          needsConfirmation: boolean;
        };
        thumb: string;
      }
    | undefined;

  if (!state) return <p>No scan result yet. Scan a card first from /scan.</p>;

  const saveCollectionAndEvidence = async () => {
    await services.storage.init();
    const session = await services.storage.getSession();
    const scanId = crypto.randomUUID();
    await services.storage.saveScan({ scanId, timestamp: new Date().toISOString(), extractedName: state.ocr.name, extractedSetCode: state.ocr.setCode, imageThumb: state.thumb, confidence: state.match.top?.score ?? 0, matchedCardId: state.match.top?.card.id, matchedPrintId: state.match.top?.print?.printId, notes });

    if (state.match.top) {
      await services.storage.queueObservation({ localObservationId: crypto.randomUUID(), createdAt: new Date().toISOString(), targetType: 'card', targetId: state.match.top.card.id, fieldPath: 'cards.name', value: state.ocr.name ?? state.match.top.card.name, ocrConfidence: state.ocr.confidence ?? 0.5, captureQualityScore: Math.min(1, Math.max(0.2, state.match.top.score)), status: 'queued', scanRef: scanId });
      if (state.match.top.print?.printId && state.ocr.setCode) {
        await services.storage.queueObservation({ localObservationId: crypto.randomUUID(), createdAt: new Date().toISOString(), targetType: 'print', targetId: state.match.top.print.printId, fieldPath: 'prints.setCode', value: state.ocr.setCode, ocrConfidence: state.ocr.confidence ?? 0.5, captureQualityScore: Math.min(1, Math.max(0.2, state.match.top.score)), status: 'queued', scanRef: scanId });
      }
    }

    if (state.match.needsConfirmation) {
      await services.storage.queueProposal({ localProposalId: crypto.randomUUID(), createdAt: new Date().toISOString(), createdByDeviceId: session?.deviceId ?? 'unknown', userId: session?.userId, type: 'correction', payload: { diff: { entity: 'card', entityId: state.match.top?.card.id, oldValues: { name: state.match.top?.card.name }, newValues: { name: state.ocr.name ?? '' } }, confidence: state.ocr.confidence, note: notes }, status: 'queued', relatedScanId: scanId });
    }

    if (state.match.top) {
      await services.storage.upsertCollection({ entryId: crypto.randomUUID(), cardId: state.match.top.card.id, printId: state.match.top.print?.printId, quantity: 1, acquiredAt: new Date().toISOString(), notes });
    }
    return scanId;
  };

  const confirm = async () => {
    await saveCollectionAndEvidence();
    navigate('/collection');
  };

  const createDraft = async () => {
    const session = await services.storage.getSession();
    const scanId = await saveCollectionAndEvidence();
    if (!session || (session.role !== 'contributor' && session.role !== 'moderator' && session.role !== 'admin')) {
      setMessage('Current role cannot submit drafts. Draft kept local only.');
      return;
    }
    await services.storage.queueDraft({
      localDraftId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sourceScanId: scanId,
      targetType: state.match.top?.print?.printId ? 'print' : state.match.top?.card.id ? 'card' : 'unknown',
      targetId: state.match.top?.print?.printId ?? state.match.top?.card.id,
      extractedFields: { ocrName: state.ocr.name, ocrSetCode: state.ocr.setCode, confidence: state.ocr.confidence },
      proposedPayload: {
        name: state.ocr.name ?? state.match.top?.card.name,
        setCode: state.ocr.setCode ?? state.match.top?.print?.setCode,
        notes,
      },
      visualFeatures: { phashFull: state.visual.hashFull, phashArt: state.visual.hashArt },
      evidenceImageThumb: state.thumb,
      status: 'queued',
    });
    setMessage('Draft created and queued for moderator review.');
  };

  return (
    <section>
      <h2>Result</h2>
      <div className="panel grid cols-2">
        <img src={state.thumb} alt="scan" style={{ width: '100%', borderRadius: 8 }} />
        <div>
          <h3>Top match</h3>
          {state.match.top ? <><p>{state.match.top.card.name}</p><p>Confidence: {(state.match.top.score * 100).toFixed(1)}%</p><p>Why: {state.match.top.reason}{state.match.top.print ? ` (${state.match.top.print.setCode})` : ''}</p></> : <p>No confident match.</p>}
          <p className={state.match.needsConfirmation ? 'status-warn' : 'status-good'}>{state.match.needsConfirmation ? 'Needs confirmation/edit.' : 'High-confidence match.'}</p>
        </div>
      </div>
      <div className="panel">
        <label>Edit/notes</label>
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Correct name/set code/stats; this can form a draft." />
      </div>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <button onClick={confirm}>Confirm & add to collection</button>
        <button className="secondary" onClick={() => navigate('/scan')}>Rescan</button>
        {(state.match.needsConfirmation || !!notes.trim()) && <button onClick={createDraft}>Create Draft for Review</button>}
      </div>
      {message && <p>{message}</p>}
    </section>
  );
}
