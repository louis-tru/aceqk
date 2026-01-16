"use strict";

import type {Editor} from "../editor";

export function parForEach(
	array: any[],
	fn: (item: any, callback: (result: any, err: any) => void) => void,
	callback: (result?: any, err?: any) => void)
{
	var completed = 0;
	var arLength = array.length;
	if (arLength === 0)
		callback();
	for (var i = 0; i < arLength; i++) {
		fn(array[i], function(result, err) {
			completed++;
			if (completed === arLength)
				callback(result, err);
		});
	}
};

var ID_REGEX = /[a-zA-Z_0-9\$\-\u00A2-\u2000\u2070-\uFFFF]/;

export function retrievePrecedingIdentifier(text: string, pos: number, regex?: RegExp) {
	regex = regex || ID_REGEX;
	var buf = [];
	for (var i = pos-1; i >= 0; i--) {
		if (regex.test(text[i]))
			buf.push(text[i]);
		else
			break;
	}
	return buf.reverse().join("");
};

export function retrieveFollowingIdentifier(text: string, pos: number, regex?: RegExp) {
	regex = regex || ID_REGEX;
	var buf = [];
	for (var i = pos; i < text.length; i++) {
		if (regex.test(text[i]))
			buf.push(text[i]);
		else
			break;
	}
	return buf;
};

/**
 * @param editor
 * @return {string}
 */
export function getCompletionPrefix(editor: Editor) {
	var pos = editor.getCursorPosition();
	var line = editor.session.getLine(pos.row);
	var prefix: string | null = null;
	editor.completers.forEach(function(completer) {
		if (completer.identifierRegexps) {
			completer.identifierRegexps.forEach(function(identifierRegex) {
				if (!prefix && identifierRegex)
					prefix = retrievePrecedingIdentifier(line, pos.column, identifierRegex);
			});
		}
	});
	return prefix || retrievePrecedingIdentifier(line, pos.column);
};

/**
 * @param {Editor} editor
 * @param {string} [previousChar] if not provided, it falls back to the preceding character in the editor
 * @returns {boolean} whether autocomplete should be triggered
 */
export function triggerAutocomplete(editor: Editor, previousChar?: string) {
	previousChar = previousChar || editor.session.getPrecedingCharacter();
	return editor.completers.some((completer) => {
		if (completer.triggerCharacters && Array.isArray(completer.triggerCharacters)) {
			return completer.triggerCharacters.includes(previousChar);
		}
	});
};
