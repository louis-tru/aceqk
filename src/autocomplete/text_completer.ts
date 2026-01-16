
import {Range} from "../range";
import type {Editor} from "../editor";
import type {Document} from "../document";
import type {Point} from "../range";

var splitRegex = /[^a-zA-Z_0-9\$\-\u00C0-\u1FFF\u2C00-\uD7FF\w]+/;

function getWordIndex(doc: Document, pos: Point) {
	var textBefore = doc.getTextRange(Range.fromPoints({
		row: 0,
		column: 0
	}, pos));
	return textBefore.split(splitRegex).length - 1;
}

/**
 * Does a distance analysis of the word `prefix` at position `pos` in `doc`.
 * @return Map
 */
function wordDistance(doc: Document, pos: Point) {
	var prefixPos = getWordIndex(doc, pos);
	var words = doc.getValue().split(splitRegex);
	var wordScores = Object.create(null);

	var currentWord = words[prefixPos];

	words.forEach(function (word, idx) {
		if (!word || word === currentWord) return;

		var distance = Math.abs(prefixPos - idx);
		var score = words.length - distance;
		if (wordScores[word]) {
			wordScores[word] = Math.max(score, wordScores[word]);
		}
		else {
			wordScores[word] = score;
		}
	});
	return wordScores;
}

export function getCompletions(
		editor: Editor,
		session: Document,
		pos: Point, prefix: string, 
		callback: (err: any, completions: any[]) => void)
{
	var wordScore = wordDistance(session, pos);
	var wordList = Object.keys(wordScore);
	callback(null, wordList.map(function (word) {
		return {
			caption: word,
			value: word,
			score: wordScore[word],
			meta: "local"
		};
	}));
};
