// "Deon C." → "deon-c". Used as the document id for each player's picks/bracket.
export function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'player';
}
