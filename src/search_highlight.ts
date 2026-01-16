"use strict";
/**
 * @typedef {import("./layer/marker").Marker} Marker
 * @typedef {import("./edit_session").EditSession} EditSession
 */

import * as lang from "./lib/lang";
import {Range} from "./range"
import type { EditSession } from "./edit_session";
import type { LayerConfig } from "./layer/lines";
import type { Marker, MarkerLike } from "./layer/marker";

export interface SearchHighlight {
	MAX_RANGES: number;
}

export class SearchHighlight implements MarkerLike {
	public regExp: RegExp;
	public clazz: string;
	public type: string;
	public cache: (Range[] | "")[]; //  offset: number; length: number;
	private docLen: number;

	/**
	 * @param {any} regExp
	 * @param {string} clazz
	 */
	constructor(regExp: RegExp = /.^/, clazz: string, type = "text") {
		this.setRegexp(regExp);
		this.clazz = clazz;
		this.type = type;
		this.docLen = 0;
	}

	setRegexp(regExp: RegExp) {
		if (this.regExp+"" == regExp+"")
			return;
		this.regExp = regExp;
		this.cache = [];
	}

	/**
	 * @param {any} html
	 * @param {Marker} markerLayer
	 * @param {EditSession} session
	 * @param {Partial<LayerConfig>} config
	 */
	update(html: string[], markerLayer: Marker, session: EditSession, config: Partial<LayerConfig>) {
		if (!this.regExp)
			return;
		var start = config.firstRow || 0;
		var end = config.lastRow || 0;
		var renderedMarkerRanges: Dict = {};
		var _search = session.$editor! && session.$editor.$search;
		var mtSearch = _search && _search.$isMultilineSearch(session.$editor!.getLastSearchOptions());

		for (var i = start; i <= end; i++) {
			var ranges = this.cache[i] as Range[];
			if (ranges == null || session.getValue().length != this.docLen) {
				if (mtSearch) {
					ranges = [];
					var match = _search.$multiLineForward(session, this.regExp, i, end);
					if (match) {
						var end_row = match.endRow <= end ? match.endRow - 1 : end;
						if (end_row > i)
							i = end_row;
						ranges.push(new Range(match.startRow, match.startCol, match.endRow, match.endCol));
					}
					if (ranges.length > this.MAX_RANGES)
						ranges = ranges.slice(0, this.MAX_RANGES);
				}
				else {
					let offsets = lang.getMatchOffsets(session.getLine(i), this.regExp);
					if (offsets.length > this.MAX_RANGES)
						offsets = offsets.slice(0, this.MAX_RANGES);
					ranges = offsets.map(function(match) {
						return new Range(i, match.offset, i, match.offset + match.length);
					});
				}
				this.cache[i] = ranges.length ? ranges : "";
			}

			if (ranges.length === 0)
				continue;

			for (var j = ranges.length; j --; ) {
				if (!ranges[j]) // safety check
					continue;
				var rangeToAddMarkerTo = ranges[j].toScreenRange(session);
				var rangeAsString = rangeToAddMarkerTo.toString();
				if (renderedMarkerRanges[rangeAsString])
					continue;

				renderedMarkerRanges[rangeAsString] = true;
				markerLayer.drawSingleLineMarker(
					html, rangeToAddMarkerTo, this.clazz, config as LayerConfig);
			}
		}
		this.docLen = session.getValue().length;
	}
}

// needed to prevent long lines from freezing the browser
SearchHighlight.prototype.MAX_RANGES = 500;
