"use strict";

/**
 * @typedef {import("./document").Document} Document
 * @typedef {import("./edit_session").EditSession} EditSession
 * @typedef {import("./tokenizer").Tokenizer} Tokenizer
 */
import {EventEmitter} from "./lib/event_emitter";
import type { Delta } from "./range";
import type { Tokenizer } from "./tokenizer_dev";
import type { Document } from "./document";
import type { EditSession } from "./edit_session";

export interface Token {
	type: string;
	value: string;
	index?: number;
	start?: number;
}

export interface BackgroundTokenizerEvents {
	/**
	 * Fires whenever the background tokeniziers between a range of rows are going to be updated.
	 * @param e An object containing two properties, `first` and `last`, which indicate the rows of the region being updated.
	 **/
	"update": (e: {
		data: { first: number, last: number }
	}, emitter: BackgroundTokenizer) => void;
}


/**
 * Tokenizes the current [[Document `Document`]] in the background, and caches the tokenized rows for future use. 
 * 
 * If a certain row is changed, everything below that row is re-tokenized.
 **/
export class BackgroundTokenizer extends EventEmitter<BackgroundTokenizerEvents> {
	/**@type {false | ReturnType<typeof setTimeout>}*/
	running: ReturnType<typeof setTimeout> | false = false;
	lines: any[] = [];
	/**@type {string[]|string[][]}*/
	states: ((string|string[]|null)[]) = [];
	currentLine: number = 0;
	tokenizer: Tokenizer;
	doc: Document;

	/**
	 * Creates a new `BackgroundTokenizer` object.
	 * @param {Tokenizer} tokenizer The tokenizer to use
	 * @param {EditSession} [session] The editor session to associate with
	 **/
	constructor(tokenizer: Tokenizer, session?: EditSession) {
		super();
		this.tokenizer = tokenizer;
	}

	private $worker = () => {
		var self = this;
		if (!self.running) { return; }

		var workerStart = new Date();
		var currentLine = self.currentLine;
		var endLine = -1;
		var doc = self.doc;

		var startLine = currentLine;
		while (self.lines[currentLine])
			currentLine++;

		var len = doc.getLength();
		var processedLines = 0;
		self.running = false;
		while (currentLine < len) {
			self.$tokenizeRow(currentLine);
			endLine = currentLine;
			do {
				currentLine++;
			} while (self.lines[currentLine]);

			// only check every 5 lines
			processedLines ++;
			//// @ts-ignore
			if ((processedLines % 5 === 0) && (new Date().valueOf() - workerStart.valueOf()) > 20) {
				self.running = setTimeout(self.$worker, 20);
				break;
			}
		}
		self.currentLine = currentLine;

		if (endLine == -1)
			endLine = currentLine;

		if (startLine <= endLine)
			self.fireUpdateEvent(startLine, endLine);
	};

	/**
	 * Sets a new tokenizer for this object.
	 * @param {Tokenizer} tokenizer The new tokenizer to use
	 **/
	setTokenizer(tokenizer: Tokenizer) {
		this.tokenizer = tokenizer;
		this.lines = [];
		this.states = [];

		this.start(0);
	}

	/**
	 * Sets a new document to associate with this object.
	 * @param {Document} doc The new document to associate with
	 **/
	setDocument(doc: Document) {
		this.doc = doc;
		this.lines = [];
		this.states = [];

		this.stop();
	}


	/**
	 * Emits the `'update'` event. `firstRow` and `lastRow` are used to define the boundaries of the region to be updated.
	 * @param {Number} firstRow The starting row region
	 * @param {Number} lastRow The final row region
	 **/
	fireUpdateEvent(firstRow: number, lastRow: number) {
		var data = {
			first: firstRow,
			last: lastRow
		};
		this._signal("update", {data: data}, this);
	}

	/**
	 * Starts tokenizing at the row indicated.
	 * @param {Number} startRow The row to start at
	 **/
	start(startRow: number) {
		this.currentLine = Math.min(startRow || 0, this.currentLine, this.doc.getLength());

		// remove all cached items below this line
		this.lines.splice(this.currentLine, this.lines.length);
		this.states.splice(this.currentLine, this.states.length);

		this.stop();
		// pretty long delay to prevent the tokenizer from interfering with the user
		this.running = setTimeout(this.$worker, 700);
	}

	/**
	 * Sets pretty long delay to prevent the tokenizer from interfering with the user
	 */
	scheduleStart() {
		if (!this.running)
			this.running = setTimeout(this.$worker, 700);
	}

	/**
	 * @param {Delta} delta
	 */
	$updateOnChange(delta: Delta) {
		var startRow = delta.start.row;
		var len = delta.end.row - startRow;

		if (len === 0) {
			this.lines[startRow] = null;
		} else if (delta.action == "remove") {
			this.lines.splice(startRow, len + 1, null);
			this.states.splice(startRow, len + 1, null);
		} else {
			var args = Array(len + 1);
			this.lines.splice(startRow, 1, ...args);
			this.states.splice(startRow, 1, ...args);
		}

		this.currentLine = Math.min(startRow, this.currentLine, this.doc.getLength());

		this.stop();
	}

	/**
	 * Stops tokenizing.
	 **/
	stop() {
		if (this.running)
			clearTimeout(this.running);
		this.running = false;
	}

	/**
	 * Gives list of [[Token]]'s of the row. (tokens are cached)
	 * @param {Number} row The row to get tokens at
	 * @returns {Token[]}
	 **/
	getTokens(row: number): Token[] {
		return this.lines[row] || this.$tokenizeRow(row);
	}

	/**
	 * Returns the state of tokenization at the end of a row.
	 * @param {Number} row The row to get state at
	 * @returns {string | string[]}
	 **/
	getState(row: number): string | string[] {
		if (this.currentLine == row)
			this.$tokenizeRow(row);
		return this.states[row] || "start";
	}

	/**
	 * @param {number} row
	 */
	$tokenizeRow(row: number) {
		var line = this.doc.getLine(row);
		var state = this.states[row - 1];
		// @ts-expect-error TODO: potential wrong argument
		var data = this.tokenizer.getLineTokens(line, state, row);

		if (this.states[row] + "" !== data.state + "") {
			this.states[row] = data.state;
			this.lines[row + 1] = null;
			if (this.currentLine > row + 1)
				this.currentLine = row + 1;
		} else if (this.currentLine == row) {
			this.currentLine = row + 1;
		}

		return this.lines[row] = data.tokens;
	}

	cleanup() {
		this.running = false;
		this.lines = [];
		this.states = [];
		this.currentLine = 0;
		this.removeAllListeners();
	}

}
