"use strict";
/**
 * @typedef {import("./editor").Editor} Editor
 * @typedef {import("../ace-internal").Ace.Point} Point
 * @typedef {import("../ace-internal").Ace.SearchOptions} SearchOptions
 */

import * as oop from "./lib/oop";
import {Search, SearchOptions} from "./search";
import {SearchHighlight} from "./search_highlight";
import {EditSession} from "./edit_session";
import type {Editor} from "./editor";
import type {Point} from "./range";
import {createCss} from 'quark';

/**
 * Finds all lines matching a search term in the current [[Document
 * `Document`]] and displays them instead of the original `Document`. Keeps
 * track of the mapping between the occur doc and the original doc.
 **/
export class Occur extends Search {

	/**
	 * Enables occur mode. expects that `options.needle` is a search term.
	 * This search term is used to filter out all the lines that include it
	 * and these are then used as the content of a new [[Document
	 * `Document`]]. The current cursor position of editor will be translated
	 * so that the cursor is on the matching row/column as it was before.
	 * @param {Editor} editor
	 * @param {Object} options options.needle should be a String
	 * @return {Boolean} Whether occur activation was successful
	 *
	 **/
	enter(editor: Editor, options: Partial<SearchOptions>) {
		if (!options.needle) return false;
		var pos = editor.getCursorPosition();
		this.displayOccurContent(editor, options);
		var translatedPos = this.originalToOccurPosition(editor.session, pos);
		editor.moveCursorToPosition(translatedPos);
		return true;
	}

	/**
	 * Disables occur mode. Resets the [[Sessions `EditSession`]] [[Document
	 * `Document`]] back to the original doc. If options.translatePosition is
	 * truthy also maps the [[Editors `Editor`]] cursor position accordingly.
	 * @param {Editor} editor
	 * @param {Object} options options.translatePosition
	 * @return {Boolean} Whether occur deactivation was successful
	 *
	 **/
	exit(editor: Editor, options: Partial<SearchOptions>) {
		var pos = options.translatePosition && editor.getCursorPosition();
		var translatedPos = pos && this.occurToOriginalPosition(editor.session, pos);
		this.displayOriginalContent(editor);
		if (translatedPos)
			editor.moveCursorToPosition(translatedPos);
		return true;
	}

	/**
	 * @param {EditSession} sess
	 * @param {RegExp} regexp
	 */
	highlight(sess: EditSession, regexp: RegExp) {
		var hl = sess.$occurHighlight = sess.$occurHighlight || sess.addDynamicMarker(
				new SearchHighlight(void 0, "ace_occur-highlight", "text"));
		hl.setRegexp(regexp);
		sess._emit("changeBackMarker", void 0, sess); // force highlight layer redraw
	}

	private $originalSession?: EditSession;
	private $useEmacsStyleLineStart?: boolean;


	/**
	 * @param {Editor} editor
	 * @param {Partial<SearchOptions>} options
	 */
	displayOccurContent(editor: Editor, options: Partial<SearchOptions>) {
		// this.setSession(session || new EditSession(""))
		this.$originalSession = editor.session;
		var found = this.matchingLines(editor.session, options);
		var lines = found.map(function(foundLine) { return foundLine.content; });
		/**@type {EditSession}*/
		var occurSession = new EditSession(lines.join('\n'));
		occurSession.$occur = this;
		occurSession.$occurMatchingLines = found;
		editor.setSession(occurSession);
		this.$useEmacsStyleLineStart = this.$originalSession.$useEmacsStyleLineStart;
		occurSession.$useEmacsStyleLineStart = this.$useEmacsStyleLineStart;
		this.highlight(occurSession, options.re);
		occurSession._emit('changeBackMarker', void 0, occurSession); // force highlight layer redraw
	}

	/**
	 * @param {Editor} editor
	 */
	displayOriginalContent(editor: Editor) {
		editor.setSession(this.$originalSession!);
		this.$originalSession!.$useEmacsStyleLineStart = this.$useEmacsStyleLineStart;
	}

	/**
	* Translates the position from the original document to the occur lines in
	* the document or the beginning if the doc {row: 0, column: 0} if not
	* found.
	* @param {EditSession} session The occur session
	* @param {Point} pos The position in the original document
	* @return {Point} position in occur doc
	**/
	originalToOccurPosition(session: EditSession, pos: Point) {
		var lines = session.$occurMatchingLines;
		var nullPos = {row: 0, column: 0};
		if (!lines) return nullPos;
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].row === pos.row)
				return {row: i, column: pos.column};
		}
		return nullPos;
	}

	/**
	* Translates the position from the occur document to the original document
	* or `pos` if not found.
	* @param {EditSession} session The occur session
	* @param {Point} pos The position in the occur session document
	* @return {Point} position
	**/
	occurToOriginalPosition(session: EditSession, pos: Point) {
		var lines = session.$occurMatchingLines;
		if (!lines || !lines[pos.row])
			return pos;
		return {row: lines[pos.row].row, column: pos.column};
	}

	/**
	 * @param {EditSession} session
	 * @param {Partial<SearchOptions>} options
	 */
	matchingLines(session: EditSession, options: Partial<SearchOptions>) {
		options = oop.mixin({}, options);
		if (!session || !options.needle) return [];
		var search = new Search();
		search.set(options);
		return search.findAll(session).reduce(function(lines, range) {
			var row = range.start.row;
			var last = lines[lines.length-1];
			return last && last.row === row ?
				lines :
				lines.concat({row: row, content: session.getLine(row)});
		}, [] as {row: number, content: string}[]);
	}
}

createCss({
	".ace_occur-highlight": {
		borderRadius: 4,
		backgroundColor: "rgba(87, 255, 8, 0.25)",
		// position: "absolute",
		zIndex: 4,
		// boxSizing: "border-box",
		boxShadow: "0 0 4 rgb(91, 255, 50)",
	},
	".ace_dark .ace_occur-highlight": {
		backgroundColor: "rgb(80, 140, 85)",
		boxShadow: "0 0 4 rgb(60, 120, 70)",
	}
});
// "incremental-occur-highlighting", false);
