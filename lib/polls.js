// vote_update event'lerinden toplanan anket oyu kaydı.
const MAX = 100;
const votes = [];

function record(vote) {
  const rec = {
    at: Date.now(),
    messageId: vote.messageId || null,
    pollName: vote.pollName || '',
    sender: String(vote.sender || vote.senderId?._serialized || '?').split('@')[0],
    options: (vote.options || []).map((o) => ({ name: o.name, localId: o.localId }))
  };
  const key = rec.messageId + '|' + rec.sender;
  const i = votes.findIndex((v) => (v.messageId + '|' + v.sender) === key);
  if (i >= 0) votes[i] = rec; else votes.push(rec);
  if (votes.length > MAX) votes.shift();
  return rec;
}

const recent = (n = 15) => votes.slice(-n);

module.exports = { record, recent };
