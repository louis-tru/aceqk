"use strict";

import type { VirtualRenderer } from "./virtual_renderer";
import {EventEmitter} from "./lib/event_emitter";
import {View,Box, Scroll} from 'quark';
import {UIEvent} from 'quark/event';
import util from "quark/util";

// on ie maximal element height is smaller than what we get from 4-5K line document
// so scrollbar doesn't work, as a workaround we do not set height higher than MAX_SCROLL_H
// and rescale scrolltop
const MAX_SCROLL_H = 0x8000;
const SCROLLBAR_SIZE = 15;

export interface ScrollbarEvents {
	"scroll": (e: { data: number }, emitter: IScrollBar) => void;
}

export interface IScrollBar extends EventEmitter<ScrollbarEvents> {
	readonly element: View;
	scrollTop: number;
	scrollLeft: number;
	scrollHeight: number;
	scrollWidth: number;
	setVisible(isVisible: boolean): void;
	getHeight(): number;
	getWidth(): number;
	setHeight(height: number, scrollHeight?: number): void;
	setWidth(width: number): void;
	setScrollHeight(height: number): void;
	setScrollWidth(width: number): void;
	setScrollTop(scrollTop: number): void;
	setScrollLeft(scrollLeft: number): void;
}

/**
 * An abstract class representing a native scrollbar control.
 **/
export abstract class Scrollbar extends EventEmitter<ScrollbarEvents> implements IScrollBar {
	public element: Scroll;
	public scrollTop: number = 0;
	public scrollLeft: number = 0;
	public scrollHeight: number = 0;
	public scrollWidth: number = 0;
	protected inner: Box;
	protected skipEvent: number;
	protected isVisible: boolean = false;
	protected coeff: number;

	/**
	 * Creates a new `ScrollBar`. `parent` is the owner of the scroll bar.
	 * @param {Element} parent A DOM element
	 * @param {string} classSuffix
	 **/
	constructor(parent: View, classSuffix: string) {
		super();
		// this.element = dom.createElement("div");
		this.element = new Scroll(parent.window);
		this.element.class = ["ace_scrollbar", "ace_scrollbar" + classSuffix];
		this.element.clip = false;

		// this.inner = dom.createElement("div");
		this.inner = new Box(parent.window);
		this.inner.addClass("ace_scrollbar-inner");
		this.element.append(this.inner);

		parent.append(this.element);

		this.setVisible(false);
		this.skipEvent = 0;

		this.element.onScroll.on(this.onScroll.bind(this));
		this.element.onMouseWheel.on(e => e.cancelBubble());
		// this.element.onMouseDown.on(e => e.cancelDefault());
	}

	setVisible(isVisible: boolean) {
		this.element.style.visible = isVisible;
		this.isVisible = isVisible;
		this.coeff = 1;
	}

	setHeight(height: number): void {}
	setWidth(width: number): void {}
	getWidth(): number { return 0 }
	getHeight(): number { return 0 }
	setScrollHeight(height: number): void {}
	setScrollWidth(width: number): void {}
	setScrollTop(scrollTop: number): void {}
	setScrollLeft(scrollLeft: number): void {}

	protected abstract onScroll(e: UIEvent): void;
}

/**
 * Represents a vertical scroll bar.
 **/
export class VScrollBar extends Scrollbar {
	private width: number = 0;
	private $minWidth: number;

	/**
	 * Creates a new `VScrollBar`. `parent` is the owner of the scroll bar.
	 * @param {Element} parent A DOM element
	 * @param {Object} renderer An editor renderer
	 **/
	constructor(parent: View, renderer: VirtualRenderer) {
		super(parent, '-v');
		this.scrollTop = 0;
		this.scrollHeight = 0;
		this.width = 0; // Does not take up space
		this.element.style.width = SCROLLBAR_SIZE;
		this.inner.style.width = SCROLLBAR_SIZE;
		this.element.style.height = 'match';
	}

	/**
	 * Emitted when the scroll bar, well, scrolls.
	 * @event scroll
	 * @internal
	 **/
	protected onScroll() {
		if (!this.skipEvent && this.element.scrollTop != this.scrollTop) {
			this.scrollTop = this.element.scrollTop;
			if (this.coeff != 1) {
				var h = this.element.clientSize.y / this.scrollHeight;
				this.scrollTop = this.scrollTop * (1 - h) / (this.coeff - h);
			}
			this._emit("scroll", {data: this.scrollTop}, this);
		}
		this.skipEvent = Math.max(0, this.skipEvent - 1);
	}

	/**
	 * Returns the width of the scroll bar.
	 * @returns {Number}
	 **/
	getWidth() {
		return this.isVisible ? this.width : 0;
	}

	/**
	 * Sets the height of the scroll bar, in pixels.
	 * @param {Number} height The new height
	 **/
	setHeight(height: number) {
		this.element.style.height = height;
	}

	/**
	 * Sets the scroll height of the scroll bar, in pixels.
	 * @param {Number} height The new scroll height
	 **/
	setScrollHeight(height: number) {
		if (height > MAX_SCROLL_H) {
			this.coeff = MAX_SCROLL_H / height;
			height = MAX_SCROLL_H;
		} else if (this.coeff != 1) {
			this.coeff = 1;
		}
		this.inner.style.height = height;
	}

	/**
	 * Sets the scroll top of the scroll bar.
	 * @param {Number} scrollTop The new scroll top
	 **/
	setScrollTop(scrollTop: number) {
		// on chrome 17+ for small zoom levels after calling this function
		// this.element.scrollTop != scrollTop which makes page to scroll up.
		if (this.scrollTop != scrollTop) {
			this.skipEvent = 2;
			this.scrollTop = scrollTop;
			this.element.scrollTop = scrollTop * this.coeff;
		}
	}
}

/**
 * Represents a horisontal scroll bar.
 **/
export class HScrollBar extends Scrollbar {
	private height: number;
	/**
	 * Creates a new `HScrollBar`. `parent` is the owner of the scroll bar.
	 * @param {Element} parent A DOM element
	 * @param {Object} renderer An editor renderer
	 **/
	constructor(parent: View, renderer: VirtualRenderer) {
		super(parent, '-h');
		this.scrollLeft = 0;
		this.height = 0; // Does not take up space
		this.inner.style.height = SCROLLBAR_SIZE;
		this.element.style.height = SCROLLBAR_SIZE;
		this.element.style.width = 'match';
		this.element.style.marginRight = SCROLLBAR_SIZE;
	}

	/**
	 * Emitted when the scroll bar, well, scrolls.
	 * @event scroll
	 * @internal
	 **/
	protected onScroll() {
		if (!this.skipEvent && this.element.scrollLeft != this.scrollLeft) {
			this.scrollLeft = this.element.scrollLeft;
			this._emit("scroll", {data: this.scrollLeft}, this);
		}
		this.skipEvent = Math.max(0, this.skipEvent - 1);
	}

	/**
	 * Returns the height of the scroll bar.
	 * @returns {Number}
	 **/
	getHeight() {
		return this.isVisible ? this.height : 0;
	}

	/**
	 * Sets the width of the scroll bar, in pixels.
	 * @param {Number} width The new width
	 **/
	setWidth(width: number) {
		this.element.style.width = width;
	}

	/**
	 * Sets the scroll width of the scroll bar, in pixels.
	 * @param {Number} width The new scroll width
	 **/
	setScrollWidth(width: number) {
		this.inner.style.width = width;
	}

	/**
	 * Sets the scroll left of the scroll bar.
	 * @param {Number} scrollLeft The new scroll left
	 **/
	setScrollLeft(scrollLeft: number) {
		// on chrome 17+ for small zoom levels after calling this function
		// this.element.scrollTop != scrollTop which makes page to scroll up.
		if (this.scrollLeft != scrollLeft) {
			this.skipEvent = 2;
			this.scrollLeft = this.element.scrollLeft = scrollLeft;
		}
	}
}

// ===================================================================
// ScrollDriver

/**
 * ScrollDriverShell is a wrapper around ScrollDriver that implements IScrollBar interface. 
 * It is used to provide scroll bar API for ScrollDriver without exposing all of its methods.
 */
export class ScrollDriverShell extends EventEmitter<ScrollbarEvents> implements IScrollBar {
	get element() { return this.host.element }
	get scrollTop() { return this.host.scrollTop }
	get scrollLeft() { return this.host.scrollLeft }
	get scrollHeight() { return this.host.scrollHeight }
	get scrollWidth() { return this.host.scrollWidth }
	set scrollTop(value: number) { this.host.setScrollTop(value) }
	set scrollLeft(value: number) { this.host.setScrollLeft(value) }
	set scrollHeight(value: number) { this.host.setScrollHeight(value) }
	set scrollWidth(value: number) { this.host.setScrollWidth(value) }

	private host: ScrollDriver;
	private isHorizontal: boolean = false;

	constructor(host: ScrollDriver, isHorizontal: boolean) {
		super();
		this.host = host;
		this.isHorizontal = isHorizontal;
	}
	setVisible(isVisible: boolean) {
		this.host[this.isHorizontal ? 'setVisibleH' : 'setVisible'](isVisible);
	}
	setHeight(height: number): void { this.host.setHeight(height); }
	setWidth(width: number): void { this.host.setWidth(width); }
	getWidth(): number { return this.host.getWidth() }
	getHeight(): number { return this.host.getHeight() }
	setScrollHeight(height: number): void { this.host.setScrollHeight(height); }
	setScrollWidth(width: number): void { this.host.setScrollWidth(width); }
	setScrollTop(scrollTop: number): void { this.host.setScrollTop(scrollTop); }
	setScrollLeft(scrollLeft: number): void { this.host.setScrollLeft(scrollLeft); }
}

/**
 * ScrollDriver is used when we want to use native scrollbars but do not want them to take space.
 * It is used in the editor in the "scrollbar" mode.
 */
export class ScrollDriver extends Scrollbar {
	public vertical: ScrollDriverShell;
	public horizontal: ScrollDriverShell;
	private isVisibleH: boolean = false;
	private pending: boolean = false;

	constructor(parent: View, renderer: VirtualRenderer) {
		super(parent, '-driver');
		this.element.style.width = '100%';
		this.element.style.height = '100%';
		this.vertical = new ScrollDriverShell(this, false);
		this.horizontal = new ScrollDriverShell(this, true);
	}

	protected onScroll(e: UIEvent) {
		if (!this.skipEvent) {
			if (this.element.scrollTop != this.scrollTop) {
				this.scrollTop = this.element.scrollTop;
				if (this.coeff != 1) {
					var h = this.element.clientSize.y / this.scrollHeight;
					this.scrollTop = this.scrollTop * (1 - h) / (this.coeff - h);
				}
				this.vertical._emit("scroll", {data: this.scrollTop}, this.vertical);
			}
			if (this.element.scrollLeft != this.scrollLeft) {
				this.scrollLeft = this.element.scrollLeft;
				this.horizontal._emit("scroll", {data: this.scrollLeft}, this.horizontal);
			}
		}
		this.skipEvent = Math.max(0, this.skipEvent - 1);
	}

	setVisible(isVisible: boolean) {
		this.isVisible = isVisible;
		this.coeff = 1;
	}

	setVisibleH(isVisible: boolean) {
		this.isVisibleH = isVisible;
		if (!isVisible) {
			// to prevent horizontal scrollbar from appearing when vertical scrollbar is hidden
			this.inner.style.width = 1;
		}
	}

	/**
	 * Returns the width of the scroll bar.
	 * @returns {Number}
	 **/
	getWidth() {
		return 0;
	}

	/**
	 * Returns the height of the scroll bar.
	 * @returns {Number}
	 **/
	getHeight() {
		return 0;
	}

	/**
	 * Sets the width of the scroll bar, in pixels.
	 * @param {Number} width The new width
	 **/
	setWidth(width: number) {
		this.element.style.width = width;
	}

	/**
	 * Sets the height of the scroll bar, in pixels.
	 * @param {Number} height The new height
	 **/
	setHeight(height: number) {
		this.element.style.height = height;
	}

	/**
	 * Sets the scroll width of the scroll bar, in pixels.
	 * @param {Number} width The new scroll width
	 **/
	setScrollWidth(width: number) {
		// to prevent horizontal scrollbar from appearing when vertical scrollbar is hidden
		this.inner.style.width = this.isVisibleH ? width : 1;
	}

	/**
	 * Sets the scroll height of the scroll bar, in pixels.
	 * @param {Number} height The new scroll height
	 **/
	setScrollHeight(height: number) {
		if (height > MAX_SCROLL_H) {
			this.coeff = MAX_SCROLL_H / height;
			height = MAX_SCROLL_H;
		} else if (this.coeff != 1) {
			this.coeff = 1;
		}
		this.inner.style.height = height;
	}

	private update() {
		this.element.scrollTop = this.scrollTop * this.coeff;
		this.element.scrollLeft = this.scrollLeft;
		this.pending = false;
	}

	/**
	 * Sets the scroll top of the scroll bar.
	 * @param {Number} scrollTop The new scroll top
	 **/
	setScrollTop(scrollTop: number) {
		if (this.scrollTop != scrollTop) {
			this.skipEvent = 2;
			this.scrollTop = scrollTop;
			this.element.scrollTop = scrollTop * this.coeff;
			if (!this.pending) {
				this.pending = true;
				util.nextTick(()=>this.update());
			}
		}
	}

	/**
	 * Sets the scroll left of the scroll bar.
	 * @param {Number} scrollLeft The new scroll left
	 **/
	setScrollLeft(scrollLeft: number) {
		if (this.scrollLeft != scrollLeft) {
			this.skipEvent = 2;
			this.scrollLeft = scrollLeft;
			this.element.scrollLeft = scrollLeft;
			if (!this.pending) {
				this.pending = true;
				util.nextTick(()=>this.update());
			}
		}
	}
}