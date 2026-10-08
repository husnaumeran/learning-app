// ============ URDU TRICKY WORDS ============
// Thin wrapper — see js/worksheets/wordreading.js (the engine) and the word list in
// js/data/word_lists.js. Words that cannot be sounded out letter by letter.
function showUrduTricky() {
    showWordReading(WORD_READING_SPECS.urdu_tricky_words);
}
window.showUrduTricky = showUrduTricky;
