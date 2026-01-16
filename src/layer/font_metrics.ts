
import * as lang from "../lib/lang";
import {EventEmitter} from "../lib/event_emitter";
import {View, Text, Box} from "quark";
import { Vec2 } from "quark/types";

const CHAR_COUNT = 512;
const L = 200;

function vec2(arr: number[]): Vec2 {
	return Vec2.new(arr[0], arr[1]);
}

type ResizeObserver = any;

export interface FontMetricsEvents {
	"changeCharacterSize": (e: { data: { height: number, width: number } }, emitter: FontMetrics) => void;
}

export class FontMetrics extends EventEmitter<FontMetricsEvents> {
	public $characterSize = {width: 0, height: 0}; //!<
	private el: Box;
	private $measureNode: Text;
	private charSizes: {[key: string]: number};
	public allowBoldFonts = false;
	private $observer?: ResizeObserver;
	private $pollSizeChangesTimer?: TimeoutResult;
	private $measureNodeValue = lang.stringRepeat("X", CHAR_COUNT);

	/**
	 * @param {View} parentEl
	 */
	constructor(parentEl: View) {
		super();
		// this.el = dom.createElement("div");
		this.el = new Box(parentEl.window);
		this.el.style.layout = 'free';

		// this.$measureNode = dom.createElement("div");
		this.$measureNode = new Text(parentEl.window);
		this.$measureNode.style.textWhiteSpace = "pre"; // prevent wrapping
		// this.$measureNode.value = lang.stringRepeat("X", CHAR_COUNT);

		this.el.append(this.$measureNode);
		parentEl.append(this.el);

		this.$characterSize = {width: 0, height: 0};

		this.checkForSizeChanges();
	}

	/**
	 * @public
	 * @param {{height: number, width: number} | null} [size]
	 */
	checkForSizeChanges(size?: {height: number, width: number} | null) {
		if (!size)
			size = this.$measureSizes();
		if (size && (this.$characterSize.width !== size.width || this.$characterSize.height !== size.height)) {
			this.$measureNode.style.textWeight = "bold";
			var boldSize = this.$measureSizes();
			this.$measureNode.style.textWeight = "regular";
			this.$characterSize = size;
			this.charSizes = Object.create(null);
			this.allowBoldFonts = !!boldSize && boldSize.width === size.width && boldSize.height === size.height;
			this._emit("changeCharacterSize", {data: size}, this);
		}
	}

	/**
	 * @public
	 * @return {number}
	 */
	$pollSizeChanges(): TimeoutResult {
		if (this.$pollSizeChangesTimer || this.$observer)
			return this.$pollSizeChangesTimer;
		var self = this;

		return this.$pollSizeChangesTimer = setTimeout(function cb() {
			self.checkForSizeChanges();
			self.$pollSizeChangesTimer = setTimeout(cb, 500);
		}, 500);
	}

	/**
	 * @param {boolean} val
	 */
	setPolling(val: boolean) {
		if (val) {
			this.$pollSizeChanges();
		} else if (this.$pollSizeChangesTimer) {
			clearTimeout(this.$pollSizeChangesTimer);
			this.$pollSizeChangesTimer = 0;
		}
	}

	$measureSizes(node?: Text): {height: number, width: number} | null {
		const lsize = node ? node.computeLayoutSize(node.value):
			this.$measureNode.computeLayoutSize(this.$measureNodeValue);
		var size = {
			height: lsize.y,
			width: lsize.x / CHAR_COUNT
		};
		// Size and width can be null if the editor is not visible or
		// detached from the document
		if (size.width === 0 || size.height === 0)
			return null;
		return size;
	}

	$measureCharWidth(ch: string): number {
		const lsize = this.$measureNode.computeLayoutSize(lang.stringRepeat(ch, CHAR_COUNT));
		return lsize.x / CHAR_COUNT;
	}

	getCharacterWidth(ch: string): number {
		var w = this.charSizes[ch];
		if (w === undefined) {
			w = this.charSizes[ch] = this.$measureCharWidth(ch) / this.$characterSize.width;
		}
		return w;
	}

	destroy() {
		clearInterval(this.$pollSizeChangesTimer);
		if (this.$observer)
			this.$observer.disconnect();
		if (this.el)
			this.el.remove();
	}

	// general transforms from element coordinates x to screen coordinates u have the form
	// | m1[0] m2[0] t[0] |   | x |       | u |
	// | m1[1] m2[1] t[1] | . | y |  == k | v |
	// | h[0]  h[1]  1    |   | 1 |       | 1 |
	// this function finds the coeeficients of the matrix using positions of four points
	transformCoordinates(clientPos: null, elPos: number[]): Vec2;
	transformCoordinates(clientPos: number[]): Vec2;
	transformCoordinates(clientPos: number[] | null, elPos?: number[]) {
		const m = this.el.morphView?.matrix;
		if (!m) return vec2(elPos ?? clientPos!);
		if (elPos) {
			// local → client
			return m.mul(vec2(elPos));
		} else {
			// client → local
			const inv = m.inverse();
			return inv.mul(vec2(clientPos!));
		}
	}
}