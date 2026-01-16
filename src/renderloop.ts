"use strict";

// import util from "quark/util";
import qk, { Window } from "quark";

type OnRender = (changes: number) => void;

/**
 * Batches changes (that force something to be redrawn) in the background.
 **/
export class RenderLoop {
	private window: Window;
	private onRender: OnRender;
	public pending: boolean;
	private changes: number;
	private $recursionLimit: number;
	private _flush: () => void;
	
	constructor(onRender: OnRender, win?: Window) {
		this.onRender = onRender;
		this.pending = false;
		this.changes = 0;
		this.$recursionLimit = 2;
		this.window = win || qk.app.activeWindow!;
		var _self = this;
		this._flush = function () {
			_self.pending = false;
			var changes = _self.changes;

			if (changes) {
				// event.blockIdle(100);
				_self.changes = 0;
				_self.onRender(changes);
			}

			if (_self.changes) {
				if (_self.$recursionLimit-- < 0)
					return;
				_self.schedule();
			}
			else {
				_self.$recursionLimit = 2;
			}
		};
	}

	schedule(change: number = 0) {
		this.changes = this.changes | change;
		if (this.changes && !this.pending) {
			this.window.nextFrame(this._flush);
			this.pending = true;
		}
	}

	clear() {
		var changes = this.changes;
		this.changes = 0;
		return changes;
	}
}

exports.RenderLoop = RenderLoop;
