"use strict";

/**
 * @typedef {import("./edit_session").EditSession} EditSession
 */

import {Range} from "./range";
import type { EditSession } from "./edit_session";
import type { Token } from "./background_tokenizer";

/**
 * This class provides an essay way to treat the document as a stream of tokens, and provides methods to iterate over these tokens.
 **/
export class TokenIterator {
	private $session: EditSession;
	public $row: number;
	public $rowTokens: Token[];
	private $tokenIndex: number;

	/**
	 * Creates a new token iterator object. The inital token index is set to the provided row and column coordinates.
	 * @param {EditSession} session The session to associate with
	 * @param {Number} initialRow The row to start the tokenizing at
	 * @param {Number} initialColumn The column to start the tokenizing at
	 **/
	constructor(session: EditSession, initialRow: number, initialColumn: number) {
		this.$session = session;
		this.$row = initialRow;
		this.$rowTokens = session.getTokens(initialRow);

		var token = session.getTokenAt(initialRow, initialColumn);
		this.$tokenIndex = token?.index || -1;
	}

	/**
	 * Moves iterator position to the start of previous token.
	 * @returns {Token|null}
	 **/ 
	stepBackward() {
		this.$tokenIndex -= 1;

		while (this.$tokenIndex < 0) {
			this.$row -= 1;
			if (this.$row < 0) {
				this.$row = 0;
				return null;
			}

			this.$rowTokens = this.$session.getTokens(this.$row);
			this.$tokenIndex = this.$rowTokens.length - 1;
		}
			
		return this.$rowTokens[this.$tokenIndex];
	}

	/**
	 * Moves iterator position to the start of next token.
	 * @returns {Token|null}
	 **/   
	stepForward() {
		this.$tokenIndex += 1;
		var rowCount;
		while (this.$tokenIndex >= this.$rowTokens.length) {
			this.$row += 1;
			if (!rowCount)
				rowCount = this.$session.getLength();
			if (this.$row >= rowCount) {
				this.$row = rowCount - 1;
				return null;
			}

			this.$rowTokens = this.$session.getTokens(this.$row);
			this.$tokenIndex = 0;
		}
			
		return this.$rowTokens[this.$tokenIndex];
	}
 
	/**
	 * 
	 * Returns current token.
	 * @returns {Token}
	 **/      
	getCurrentToken() {
		return this.$rowTokens[this.$tokenIndex];
	}

	/**
	 * 
	 * Returns the current row.
	 * @returns {Number}
	 **/      
	getCurrentTokenRow() {
		return this.$row;
	}

	/**
	 * 
	 * Returns the current column.
	 * @returns {Number}
	 **/     
	getCurrentTokenColumn() {
		var rowTokens = this.$rowTokens;
		var tokenIndex = this.$tokenIndex;
		
		// If a column was cached by EditSession.getTokenAt, then use it
		var column = rowTokens[tokenIndex].start;
		if (column !== undefined)
			return column;
			
		column = 0;
		while (tokenIndex > 0) {
			tokenIndex -= 1;
			column += rowTokens[tokenIndex].value.length;
		}
		
		return column;  
	}

	/**
	 * Return the current token position.
	 * @returns {import("../ace-internal").Ace.Point}
	 */
	getCurrentTokenPosition() {
		return {row: this.$row, column: this.getCurrentTokenColumn()};
	}
	
	/**
	 * Return the current token range.
	 * @returns {Range}
	 */
	getCurrentTokenRange() {
		var token = this.$rowTokens[this.$tokenIndex];
		var column = this.getCurrentTokenColumn();
		return new Range(this.$row, column, this.$row, column + token.value.length);
	}
	
}
