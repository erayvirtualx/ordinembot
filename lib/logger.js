const MAX_LOGS = 1000;
const MAX_MESSAGES = 2000;

function add(db, kind, details = {}) {
  const event = { at: Date.now(), kind, ...details };
  db.data.logs ||= [];
  db.data.logs.push(event);
  if (db.data.logs.length > MAX_LOGS) db.data.logs.splice(0, db.data.logs.length - MAX_LOGS);
  db.save();
  return event;
}

function message(db, row) {
  if (!db.data.settings.messageHistoryEnabled || row.isStatus || row.isViewOnce) return;
  db.data.messageHistory ||= [];
  db.data.messageHistory.push(row);
  if (db.data.messageHistory.length > MAX_MESSAGES) db.data.messageHistory.splice(0, db.data.messageHistory.length - MAX_MESSAGES);
  db.save();
}

module.exports = { add, message };
