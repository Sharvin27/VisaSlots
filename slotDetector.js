const stringSimilarity = require("string-similarity");

const positiveKeywords = [
    "slot available",
    "slots available",
    "slot is available",
    "slots are available",
    "slots are open",
    "got slot",
    "slot opened",
    "slot open",
    "slots released",
    "slot release",
    "slots came",
    "slot dropped",
    "slots drop",
    "slot got",
    "booked slot"
];

const negativePatterns = [
    "no slot",
    "no slots",
    "slots not available",
    "no slots available",
    "slots unavailable",
    "slot unavailable",
    "slots not open",
    "slot not open",
    "slot closed",
    "slots closed",
    "none available"
];

function preprocessText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function isSlotAlertMessage(text) {
    const processed = preprocessText(text);
    const SIMILARITY_THRESHOLD = 0.8;

    if (negativePatterns.some(p => processed.includes(p))) {
        return false;
    }

    return positiveKeywords.some(keyword =>
        processed.includes(keyword) ||
        stringSimilarity.compareTwoStrings(processed, keyword) > SIMILARITY_THRESHOLD
    );
}

module.exports = { isSlotAlertMessage };
