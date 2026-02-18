import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useServices } from '../hooks/useServices';

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const services = useServices();
  const [notes, setNotes] = useState('');

  const state = location.state as
    | {
        ocr: { text: string; name?: string; setCode?: string; confidence?: number };
        match: {
          top?: { card: { id: string; name: string }; print?: { printId: string; setCode: string }; score: number; reason: string };
          alternatives: { card: { id: string; name: string }; score: number; reason: string }[];
          needsConfirmation: boolean;
        };
        thumb: string;
      }
    | undefined;

  if (!state) return <p>No scan result yet. Scan a card first from /scan.</p>;

  const confirm = async () => {
    await services.storage.init();
    const session = await services.storage.getSession();
    const scanId = crypto.randomUUID();
    await services.storage.saveScan({
      scanId,
      timestamp: new Date().toISOString(),
      extractedName: state.ocr.name,
      extractedSetCode: state.ocr.setCode,
      imageThumb: state.thumb,
      confidence: state.match.top?.score ?? 0,
      matchedCardId: state.match.top?.card.id,
      matchedPrintId: state.match.top?.print?.printId,
      notes,
    });

    if (state.match.needsConfirmation) {
      await services.storage.queueProposal({
        localProposalId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        createdByDeviceId: session?.deviceId ?? 'unknown-device',
        userId: session?.userId,
        type: 'correction',
        payload: {
          diff: {
            entity: 'card',
            entityId: state.match.top?.card.id,
            oldValues: { name: state.match.top?.card.name ?? null },
            newValues: { name: state.ocr.name ?? state.match.top?.card.name ?? '' },
          },
          note: notes,
          confidence: state.ocr.confidence,
          scanImageRef: scanId,
          ocrExtractedName: state.ocr.name,
          ocrExtractedSetCode: state.ocr.setCode,
        },
        relatedScanId: scanId,
        status: 'queued',
      });
    }


    if (state.match.top) {
      await services.storage.queueObservation({
        localObservationId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        targetType: 'card',
        targetId: state.match.top.card.id,
        fieldPath: 'cards.name',
        value: state.ocr.name ?? state.match.top.card.name,
        ocrConfidence: state.ocr.confidence ?? 0.5,
        captureQualityScore: Math.min(1, Math.max(0.2, state.match.top.score)),
        status: 'queued',
        scanRef: scanId,
      });
      if (state.match.top.print?.printId && state.ocr.setCode) {
        await services.storage.queueObservation({
          localObservationId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          targetType: 'print',
          targetId: state.match.top.print.printId,
          fieldPath: 'prints.setCode',
          value: state.ocr.setCode,
          ocrConfidence: state.ocr.confidence ?? 0.5,
          captureQualityScore: Math.min(1, Math.max(0.2, state.match.top.score)),
          status: 'queued',
          scanRef: scanId,
        });
      }
    }

    if (state.match.top) {
      await services.storage.upsertCollection({
        entryId: crypto.randomUUID(),
        cardId: state.match.top.card.id,
        printId: state.match.top.print?.printId,
        quantity: 1,
        acquiredAt: new Date().toISOString(),
        notes,
      });
    }
    navigate('/collection');
  };

  return (
    <section>
      <h2>Result</h2>
      <div className="panel grid cols-2">
        <img src={state.thumb} alt="scan" style={{ width: '100%', borderRadius: 8 }} />
        <div>
          <h3>Top match</h3>
          {state.match.top ? (
            <div>
              <p>{state.match.top.card.name}</p>
              <p>Confidence: {(state.match.top.score * 100).toFixed(1)}%</p>
              <p>Why: {state.match.top.reason}{state.match.top.print ? ` (${state.match.top.print.setCode})` : ''}</p>
            </div>
          ) : <p>No confident match.</p>}
          <p className={state.match.needsConfirmation ? 'status-warn' : 'status-good'}>
            {state.match.needsConfirmation ? 'Needs confirmation/edit (will create proposal).' : 'High-confidence match.'}
          </p>
        </div>
      </div>
      <div className="panel">
        <h3>Alternatives</h3>
        <div className="list">
          {state.match.alternatives.map((x) => (
            <div className="card" key={`${x.card.id}-${x.score}`}>{x.card.name} · {x.reason} · {(x.score * 100).toFixed(0)}%</div>
          ))}
        </div>
      </div>
      <div className="panel">
        <label>Edit/notes</label>
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fix OCR, set code, rarity, etc. This becomes a moderation proposal." />
      </div>
      <button onClick={confirm}>Confirm & add to collection</button>{' '}
      <button className="secondary" onClick={() => navigate('/scan')}>Rescan</button>
    </section>
  );
}
